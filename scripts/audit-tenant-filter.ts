#!/usr/bin/env bun

/**
 * Static check for two tenant-isolation invariants:
 *
 *   1. Every Prisma call on a tenant-scoped table must route through a
 *      `withTenant` / `withAdmin` transaction (i.e. use `tx.<model>.*`,
 *      never `prisma.<model>.*`). Without this, the RLS session variable
 *      is unset and — under the strict post-10g policy — reads return
 *      empty and writes are rejected.
 *
 *   2. Every such call must filter by `organizationId` (or `organization`).
 *      Reads / updates / deletes filter via `where`; creates via `data`.
 *      Defense-in-depth behind RLS — the filter is what the ORM sees
 *      even if a future policy change re-introduces a compat branch.
 *
 * Run via `bun run audit:tenant-filter` (CI gate). Exits non-zero on any
 * violation of either invariant.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const SCAN_ROOTS = [
  path.join(ROOT, "src/app"),
  path.join(ROOT, "src/lib"),
  path.join(ROOT, "src/components"),
];

const TENANT_MODELS = [
  "rack",
  "device",
  "subnet",
  "vlan",
  "vlanAssignment",
  "ipAssignment",
  "dhcpRange",
  "connection",
  "floorPlan",
  "discoveryScan",
  "buildPlan",
  "recommendationDismissal",
  "auditLog",
] as const;

const READ_METHODS = [
  "findMany",
  "findFirst",
  "findUnique",
  "findUniqueOrThrow",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
];

const WRITE_METHODS = [
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
];

const CREATE_METHODS = ["create", "createMany"];

/**
 * Files exempt from invariant #2 (the organizationId-filter check). These
 * wrap or use callsites in ways the regex can't see — each entry has a
 * comment explaining why the exemption is safe.
 */
const EXEMPT_FILES = [
  // Defines the withTenant wrapper; the example in its JSDoc comment is
  // stripped by stripComments but safety-netted here too.
  "src/lib/prisma-tenant.ts",
  // Defines the withAdmin wrapper; no tenant-model calls at all.
  "src/lib/prisma-admin.ts",
];

/**
 * Files exempt from invariant #1 (the outside-withTenant check). Only the
 * two wrapper-defining files legitimately reference `prisma.$transaction`
 * at module scope; every other file must route tenant-model access
 * through `tx.<model>.*` inside a `withTenant` / `withAdmin` callback.
 */
const DIRECT_PRISMA_EXEMPT_FILES = [
  "src/lib/prisma-tenant.ts",
  "src/lib/prisma-admin.ts",
];

/**
 * Files permitted to import / call `withAdmin` — the RLS-bypass escape
 * hatch. Per CLAUDE.md the legitimate call sites are exactly three:
 * seeds, onboarding auto-org-create, and integration test factories.
 * Within `src/` only the wrapper-defining file itself qualifies — the
 * other two live outside the audit's scan roots (`prisma/seed.ts`,
 * `tests/integration/factories.ts`).
 *
 * Adding a fourth `src/` call site is an intentional change. Append the
 * file path here with a one-line comment explaining why the bypass is
 * warranted. The presence of the comment is a code-review touchpoint.
 */
const WITHADMIN_EXEMPT_FILES = [
  // Defines `withAdmin` itself; must reference it at module scope.
  "src/lib/prisma-admin.ts",
];

type Violation = {
  file: string;
  line: number;
  model: string;
  method: string;
  callKind: "read" | "write" | "create";
  snippet: string;
  reason:
    | "missing-org-filter"
    | "outside-withTenant"
    | "unauthorized-withAdmin";
};

async function walkDir(dir: string, files: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      await walkDir(full, files);
    } else if (
      (entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
      !entry.endsWith(".test.ts") &&
      !entry.endsWith(".test.tsx") &&
      !entry.endsWith(".d.ts")
    ) {
      files.push(full);
    }
  }
  return files;
}

function matchClosingParen(source: string, openIdx: number): number {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = openIdx; i < source.length; i++) {
    const c = source[i];
    const next = source[i + 1];
    if (inLineComment) {
      if (c === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inSingle) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === '"') inDouble = false;
      continue;
    }
    if (inBacktick) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === "`") inBacktick = false;
      continue;
    }
    if (c === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (c === "'") inSingle = true;
    else if (c === '"') inDouble = true;
    else if (c === "`") inBacktick = true;
    else if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function classify(method: string): Violation["callKind"] | null {
  if (READ_METHODS.includes(method)) return "read";
  if (WRITE_METHODS.includes(method)) return "write";
  if (CREATE_METHODS.includes(method)) return "create";
  return null;
}

function lineOf(source: string, idx: number): number {
  let line = 1;
  for (let i = 0; i < idx; i++) if (source[i] === "\n") line++;
  return line;
}

/**
 * Strip line + block comments from source so JSDoc examples like
 * `// await tx.rack.create({ data: { ... } })` don't fire as violations.
 * Replaces comment regions with whitespace of the same length so line
 * numbers remain accurate.
 */
function stripComments(source: string): string {
  const out: string[] = new Array(source.length);
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    const next = source[i + 1];
    if (inLineComment) {
      out[i] = c === "\n" ? "\n" : " ";
      if (c === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      out[i] = c === "\n" ? "\n" : " ";
      if (c === "*" && next === "/") {
        out[i + 1] = " ";
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inSingle) {
      out[i] = c;
      if (c === "\\") {
        out[i + 1] = source[i + 1] ?? "";
        i++;
        continue;
      }
      if (c === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      out[i] = c;
      if (c === "\\") {
        out[i + 1] = source[i + 1] ?? "";
        i++;
        continue;
      }
      if (c === '"') inDouble = false;
      continue;
    }
    if (inBacktick) {
      out[i] = c;
      if (c === "\\") {
        out[i + 1] = source[i + 1] ?? "";
        i++;
        continue;
      }
      if (c === "`") inBacktick = false;
      continue;
    }
    if (c === "/" && next === "/") {
      out[i] = " ";
      out[i + 1] = " ";
      inLineComment = true;
      i++;
      continue;
    }
    if (c === "/" && next === "*") {
      out[i] = " ";
      out[i + 1] = " ";
      inBlockComment = true;
      i++;
      continue;
    }
    out[i] = c;
    if (c === "'") inSingle = true;
    else if (c === '"') inDouble = true;
    else if (c === "`") inBacktick = true;
  }
  return out.join("");
}

/**
 * Decide whether the args to a Prisma call carry an organizationId guard.
 *
 * Accepts:
 * - args mention `organizationId` or `organization:` anywhere
 * - update/delete/upsert/findUnique with `where: { id: ... }` — by-unique
 *   filter, safe when paired with a preceding org-scoped find or RLS
 *   (defense in depth via the `withTenant` wrapper)
 * - args use `where: someVariable` — opaque to static analysis; trust the
 *   variable's caller (typed in the action file)
 */
function isCallSafe(method: string, args: string): boolean {
  if (/\borganizationId\b/.test(args)) return true;
  if (/\borganization\s*:/.test(args)) return true;

  const isByIdAcceptable = [
    "update",
    "delete",
    "upsert",
    "findUnique",
    "findUniqueOrThrow",
  ].includes(method);
  if (isByIdAcceptable) {
    // where: { id: ... }  OR  where: { id }   (shorthand)
    if (/where\s*:\s*\{\s*id\s*[:,}]/.test(args)) return true;
    // where: { someField_organizationId: {...} }  (compound unique)
    if (/where\s*:\s*\{\s*\w+_\w+\s*:/.test(args)) return true;
  }

  // Opaque where variable (where: someName, not where: { ... }) including
  // the object-shorthand form `{ where, ... }`.
  if (/where\s*:\s*[A-Za-z_$][\w$]*\s*[,}]/.test(args)) return true;
  if (/^\s*\{\s*where\s*[,}]/.test(args)) return true;

  // Symmetric: creates with an opaque `data` variable. Same trust level
  // as `where: someVar` — the variable is typed in the caller, and the
  // author is responsible for ensuring `organizationId` is present.
  if (/data\s*:\s*[A-Za-z_$][\w$]*\s*[,}]/.test(args)) return true;
  if (/^\s*\{\s*data\s*[,}]/.test(args)) return true;

  return false;
}

function auditFile(
  relPath: string,
  source: string,
  opts: {
    checkFilter: boolean;
    checkDirectPrisma: boolean;
    checkWithAdmin: boolean;
  },
): Violation[] {
  const violations: Violation[] = [];
  const allMethods = [...READ_METHODS, ...WRITE_METHODS, ...CREATE_METHODS];
  const stripped = stripComments(source);

  // Invariant #3: only the explicitly-allow-listed files may import or
  // call `withAdmin`. Match on the identifier (word boundary) so a string
  // literal or a comment mentioning `withAdmin` doesn't flag. A file that
  // legitimately needs the RLS bypass must be added to
  // `WITHADMIN_EXEMPT_FILES` with a justification comment.
  if (opts.checkWithAdmin) {
    const withAdminPattern = /\bwithAdmin\b/g;
    let adminMatch: ReturnType<RegExp["exec"]>;
    while ((adminMatch = withAdminPattern.exec(stripped)) !== null) {
      const line = lineOf(stripped, adminMatch.index);
      const snippet = source
        .slice(
          adminMatch.index,
          Math.min(adminMatch.index + 120, source.length),
        )
        .replace(/\s+/g, " ");
      violations.push({
        file: relPath,
        line,
        model: "-",
        method: "withAdmin",
        callKind: "read",
        snippet,
        reason: "unauthorized-withAdmin",
      });
    }
  }

  const callPattern = new RegExp(
    `\\b(prisma|tx)\\.(${TENANT_MODELS.join("|")})\\.(${allMethods.join("|")})\\(`,
    "g",
  );

  let match: ReturnType<RegExp["exec"]>;
  while ((match = callPattern.exec(stripped)) !== null) {
    const receiver = match[1];
    const model = match[2];
    const method = match[3];
    const kind = classify(method);
    if (!kind) continue;

    const openParenIdx = match.index + match[0].length - 1;
    const closeIdx = matchClosingParen(stripped, openParenIdx);
    if (closeIdx < 0) continue;
    const args = stripped.slice(openParenIdx + 1, closeIdx);

    const line = lineOf(stripped, match.index);
    const snippet = source
      .slice(match.index, Math.min(match.index + 120, source.length))
      .replace(/\s+/g, " ");

    // Invariant #1: direct `prisma.<tenantModel>.*` bypasses the RLS
    // session variable. Always a violation except inside the two wrapper
    // files. This runs first — a call that fails #1 also almost always
    // fails #2, and the #1 message is more actionable.
    if (opts.checkDirectPrisma && receiver === "prisma") {
      violations.push({
        file: relPath,
        line,
        model,
        method,
        callKind: kind,
        snippet,
        reason: "outside-withTenant",
      });
      continue;
    }

    // Invariant #2: `tx.<tenantModel>.*` must carry an organizationId
    // filter. Opaque `where: someVar` / by-id accept per isCallSafe.
    if (opts.checkFilter && !isCallSafe(method, args)) {
      violations.push({
        file: relPath,
        line,
        model,
        method,
        callKind: kind,
        snippet,
        reason: "missing-org-filter",
      });
    }
  }
  return violations;
}

async function main(): Promise<number> {
  const allFiles: string[] = [];
  for (const root of SCAN_ROOTS) {
    await walkDir(root, allFiles);
  }

  const violations: Violation[] = [];
  let scanned = 0;
  for (const file of allFiles) {
    const rel = path.relative(ROOT, file);
    scanned++;
    const source = await readFile(file, "utf8");
    violations.push(
      ...auditFile(rel, source, {
        checkFilter: !EXEMPT_FILES.includes(rel),
        checkDirectPrisma: !DIRECT_PRISMA_EXEMPT_FILES.includes(rel),
        checkWithAdmin: !WITHADMIN_EXEMPT_FILES.includes(rel),
      }),
    );
  }

  if (violations.length === 0) {
    console.log(
      `OK tenant-filter audit clean -- scanned ${scanned} files, all Prisma calls on tenant-scoped tables route through withTenant/withAdmin AND filter by organizationId`,
    );
    return 0;
  }

  const outsideWrapper = violations.filter(
    (v) => v.reason === "outside-withTenant",
  );
  const missingFilter = violations.filter(
    (v) => v.reason === "missing-org-filter",
  );
  const unauthorizedAdmin = violations.filter(
    (v) => v.reason === "unauthorized-withAdmin",
  );

  console.error(
    `FAIL tenant-filter audit -- ${violations.length} violation(s) across ${scanned} files:\n`,
  );
  if (unauthorizedAdmin.length > 0) {
    // Deduplicate per file — a file with multiple withAdmin references only
    // needs one line; the reviewer should assess the whole file.
    const seenFiles = new Set<string>();
    const unique = unauthorizedAdmin.filter((v) => {
      if (seenFiles.has(v.file)) return false;
      seenFiles.add(v.file);
      return true;
    });
    console.error(
      `  ${unique.length} file(s) reference withAdmin without being on the exemption list:\n`,
    );
    for (const v of unique) {
      console.error(`    ${v.file}:${v.line}  withAdmin referenced here`);
      console.error(`      ${v.snippet}\n`);
    }
    console.error(
      `  withAdmin bypasses RLS and is reserved for seeds, onboarding auto-org-create, and integration test factories.`,
    );
    console.error(
      `  If a new call site is genuinely warranted, add the path to WITHADMIN_EXEMPT_FILES in scripts/audit-tenant-filter.ts with a justification comment (code-review touchpoint).\n`,
    );
  }
  if (outsideWrapper.length > 0) {
    console.error(
      `  ${outsideWrapper.length} call(s) use prisma.<model> directly instead of tx.<model> inside withTenant/withAdmin:\n`,
    );
    for (const v of outsideWrapper) {
      console.error(
        `    ${v.file}:${v.line}  [${v.callKind}]  prisma.${v.model}.${v.method}`,
      );
      console.error(`      ${v.snippet}\n`);
    }
    console.error(
      `  Wrap each call above: await withTenant(organizationId, (tx) => tx.<model>.<method>({...}))`,
    );
    console.error(
      `  The RLS session variable is only set on the tx connection — prisma.* uses a separate pool connection and (under the strict policy) returns empty or rejects writes.\n`,
    );
  }
  if (missingFilter.length > 0) {
    console.error(
      `  ${missingFilter.length} call(s) missing organizationId filter:\n`,
    );
    for (const v of missingFilter) {
      console.error(
        `    ${v.file}:${v.line}  [${v.callKind}]  tx.${v.model}.${v.method}`,
      );
      console.error(`      ${v.snippet}\n`);
    }
    console.error(
      `  Add where: { organizationId, ... } (reads/writes) or data: { organizationId, ... } (creates) to each call above.`,
    );
    console.error(
      `  If a call genuinely cannot be tenant-scoped, add the file to EXEMPT_FILES in scripts/audit-tenant-filter.ts with a documented reason.`,
    );
  }
  return 1;
}

main()
  .then((code) => {
    if (code !== 0) {
      throw new Error(`audit failed with code ${code}`);
    }
  })
  .catch((err) => {
    console.error(err.message ?? err);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as unknown as { exit: (n: number) => void }).exit(1);
  });
