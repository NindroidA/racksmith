import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Admin-mode Prisma transaction. Bypasses the RLS `organizationId` filter
 * by setting `app.role = 'admin'` on the transaction. The RLS policies
 * check this flag and short-circuit access-control when set.
 *
 * **Legitimate call sites (exhaustive list):**
 *   - `tests/integration/factories.ts` — constructs fresh Orgs/Users/Racks
 *     across tenants for the isolation test suite.
 *   - `tests/integration/cross-tenant-isolation.test.ts` — reads rows across
 *     tenants to verify RLS is actually filtering request-path queries.
 *   - Future background workers / cron jobs (Phase 17+) — not present in
 *     this tree yet; add with the same rigor.
 *
 * **Not used by `prisma/seed.ts`** — the seed owns the DB (`bun run
 * prisma db seed` runs before RLS is engaged against authenticated
 * traffic) and talks to a raw `new PrismaClient()`. **Not used by
 * onboarding auto-org-create** — `src/app/onboarding/welcome/page.tsx`
 * calls `prisma.$transaction` on Organization + Member, which are
 * non-tenant tables (no RLS FORCED), so the bypass is unnecessary.
 *
 * **Do NOT import from server actions or API routes.** Server actions
 * always have an authenticated user + org context and should use
 * `withTenant(organizationId, ...)` from `./prisma-tenant`.
 *
 * If you find yourself wanting to use this from request-path code, stop
 * and add the missing `organizationId` plumbing instead — that's the
 * signal that an access-control boundary is missing, not that the RLS
 * is in the way.
 */
export async function withAdmin<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.role', 'admin', true)`;
    return fn(tx);
  });
}
