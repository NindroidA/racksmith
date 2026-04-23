import "server-only";

import type { Prisma } from "@prisma/client";

/**
 * Revoke every active API key in `organizationId` that was created by
 * `userId`. Meant to be called INSIDE a `prisma.$transaction` (not
 * `withTenant` — `ApiKey` is non-tenant-scoped, so the RLS session
 * variable is not required), so the revocation is atomic with the
 * surrounding mutation (e.g. the member delete in `removeMember`).
 *
 * Returns the list of revoked key IDs so the caller can emit per-key
 * audit rows AFTER the tx commits. We don't emit audits inside the tx
 * because `audit()` opens its own `withTenant` transaction internally,
 * and nesting that inside the caller's tx would fight over the same
 * connection.
 *
 * Extracted as a standalone helper so the integration suite can exercise
 * the revocation logic directly — `removeMember` itself reads the
 * Better Auth session via `requireMember`, which has no stubbing path
 * in the current test infrastructure.
 */
export async function revokeKeysCreatedByUser(
  tx: Prisma.TransactionClient,
  organizationId: string,
  userId: string,
): Promise<string[]> {
  const active = await tx.apiKey.findMany({
    where: {
      organizationId,
      createdByUserId: userId,
      revokedAt: null,
    },
    select: { id: true },
  });
  if (active.length === 0) return [];
  await tx.apiKey.updateMany({
    where: { id: { in: active.map((k) => k.id) } },
    data: { revokedAt: new Date() },
  });
  return active.map((k) => k.id);
}
