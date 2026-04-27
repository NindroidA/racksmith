import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildOpenApiSpec, registry } from "@/lib/api/openapi-registry";
import { registerV1Routes } from "@/lib/api/v1-routes";

// Populate the singleton once. registerV1Routes is idempotent per registry,
// so re-runs across test files are safe.
registerV1Routes(registry);

/**
 * Walk a directory tree and return every file matching `predicate`.
 * Used here to discover route files on disk so the test can compare them
 * against what's actually registered with OpenAPI.
 */
function walkSync(dir: string, predicate: (full: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkSync(full, predicate));
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Convert a v1 route file path to the OpenAPI path it should produce.
 *   src/app/api/v1/racks/route.ts        → /api/v1/racks
 *   src/app/api/v1/racks/[id]/route.ts   → /api/v1/racks/{id}
 */
function routeFileToOpenApiPath(file: string, projectRoot: string): string {
  const rel = path.relative(projectRoot, file);
  return (
    "/" +
    rel
      .replace(/^src\/app\//, "")
      .replace(/\/route\.ts$/, "")
      .replace(/\[(\w+)\]/g, "{$1}")
  );
}

describe("OpenAPI spec coverage", () => {
  it("every v1 route file is registered in the OpenAPI spec", () => {
    const projectRoot = process.cwd();
    const v1Dir = path.join(projectRoot, "src", "app", "api", "v1");

    // Collect all route.ts files under api/v1, excluding meta endpoints
    // (openapi.json, docs) which serve the spec rather than appear in it.
    const routeFiles = walkSync(v1Dir, (full) => {
      if (!full.endsWith("route.ts")) return false;
      if (full.includes("openapi.json")) return false;
      if (full.includes(`${path.sep}docs${path.sep}`)) return false;
      return true;
    });

    expect(routeFiles.length).toBeGreaterThan(0);

    const expectedPaths = routeFiles
      .map((f) => routeFileToOpenApiPath(f, projectRoot))
      .sort();

    const spec = buildOpenApiSpec();
    const actualPaths = Object.keys(spec.paths ?? {}).sort();

    // Each on-disk route file must produce at least one path entry. If a
    // new route is added but its `registerRoutes` isn't wired into
    // `src/lib/api/v1-routes.ts`, this test fails with the missing path.
    for (const expected of expectedPaths) {
      expect(
        actualPaths,
        `route file exists for ${expected} but no entry in spec — did you add registerRoutes to src/lib/api/v1-routes.ts?`,
      ).toContain(expected);
    }
  });

  it("every spec path corresponds to a route file on disk", () => {
    const projectRoot = process.cwd();
    const v1Dir = path.join(projectRoot, "src", "app", "api", "v1");

    const routeFiles = walkSync(v1Dir, (f) => f.endsWith("route.ts"));
    const onDiskPaths = new Set(
      routeFiles.map((f) => routeFileToOpenApiPath(f, projectRoot)),
    );

    const spec = buildOpenApiSpec();
    for (const specPath of Object.keys(spec.paths ?? {})) {
      expect(
        onDiskPaths,
        `spec contains ${specPath} but no matching route file — stale registration?`,
      ).toContain(specPath);
    }
  });
});
