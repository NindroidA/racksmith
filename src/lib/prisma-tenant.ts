import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Run a unit of Prisma work inside a transaction whose session variable
 * `app.organization_id` is scoped to the given organization. RLS policies
 * on every tenant-scoped table read this setting — rows whose
 * `organizationId` doesn't match are invisible to reads and rejected
 * on writes.
 *
 * Uses `SET LOCAL` (via `set_config(..., is_local=true)`) so the scope
 * ends when the transaction commits or rolls back — connections returned
 * to Prisma's pool don't carry the variable into the next request.
 *
 * Post-10g the RLS policies are **strict**
 * (see `20260420120000_phase_10g_rls_strict`): an unset session variable
 * no longer short-circuits access. Callers that reach a tenant-scoped
 * table via `prisma.*` (instead of `tx.*` inside this wrapper) hit a
 * fail-closed policy — reads return empty, writes error out. CI enforces
 * the wrapper invariant via `scripts/audit-tenant-filter.ts`.
 *
 * @example
 *   const rack = await withTenant(organizationId, async (tx) => {
 *     await assertCanCreateRackLocked(tx, organizationId);
 *     return tx.rack.create({
 *       data: { userId, organizationId, name, sizeU },
 *     });
 *   });
 */
export async function withTenant<T>(
  organizationId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.organization_id', ${organizationId}, true)`;
    return fn(tx);
  });
}

/**
 * Acquire a transaction-scoped advisory lock keyed on
 * `(organizationId, resource)`. Auto-releases at transaction end. Callers
 * serialize on the same `(organizationId, resource)` pair — the rest of
 * Postgres is unaffected.
 *
 * Use to close TOCTOU races on tier-limit checks: between "count current"
 * and "create row", no other transaction with the same key can race in
 * and burn the last slot.
 *
 * `hashtext` returns int4. The two-argument `pg_advisory_xact_lock(int4, int4)`
 * partitions the lock space into `(key1, key2)`, so `(orgHash, resourceHash)`
 * never collides with a lock using a different `resource`.
 */
export async function acquireTenantResourceLock(
  tx: Prisma.TransactionClient,
  organizationId: string,
  resource: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}), hashtext(${resource}))`;
}
