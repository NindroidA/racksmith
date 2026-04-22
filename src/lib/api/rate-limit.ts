import type { Prisma } from "@prisma/client";

export const RATE_LIMIT_WINDOW_SECONDS = 60;

export type CheckAndRecordInput = {
  apiKeyId: string;
  organizationId: string;
  quotaPerMinute: number;
  weight: number;
  requestId: string; // used as ApiRequestLog.id so the request-id header + log row line up
  method: string;
  path: string;
  responseStatus: number; // recorded for observability; factory sets 200 pre-handler
  // and can update via a follow-up write if needed. Phase 11 records pre-handler
  // status (200 for allowed, 429 if we bail here) — a "true" final status
  // would require a post-handler update which we defer.
};

export type CheckAndRecordResult = {
  allowed: boolean;
  used: number;       // sum(weight) in the window AFTER this request (if allowed)
  remaining: number;
  resetAt: number;    // unix seconds — now + 60
};

/**
 * Sliding-window rate-limit check + record. Must be called inside
 * `withTenant(organizationId, tx => …)` so the RLS session var is set.
 *
 * The aggregate's `where` filters by both `apiKeyId` and `organizationId`.
 * `apiKeyId` alone is semantically sufficient (it's globally unique and
 * implies an org), but including `organizationId` gives defense-in-depth
 * behind RLS and aligns with the project's tenant-filter convention
 * (see CLAUDE.md "Multi-tenancy" — ApiRequestLog is tenant-scoped). It
 * also matches the `@@index([organizationId, createdAt])` on the model.
 *
 * Atomicity note: the aggregate + create aren't serialized with an
 * advisory lock — concurrent requests at exactly the same ms can both
 * observe "under quota" and both insert, overshooting by 1. Cosmetic at
 * any realistic traffic level; upgrading to pg_advisory_xact_lock keyed
 * on apiKeyId would add a round-trip for negligible safety gain.
 */
export async function checkAndRecord(
  tx: Prisma.TransactionClient,
  input: CheckAndRecordInput,
): Promise<CheckAndRecordResult> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000);
  const agg = await tx.apiRequestLog.aggregate({
    where: {
      apiKeyId: input.apiKeyId,
      organizationId: input.organizationId,
      createdAt: { gt: windowStart },
    },
    _sum: { weight: true },
  });
  const used = agg._sum.weight ?? 0;
  const resetAt = Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW_SECONDS;

  if (used + input.weight > input.quotaPerMinute) {
    return {
      allowed: false,
      used,
      remaining: Math.max(0, input.quotaPerMinute - used),
      resetAt,
    };
  }

  await tx.apiRequestLog.create({
    data: {
      id: input.requestId,
      organizationId: input.organizationId,
      apiKeyId: input.apiKeyId,
      method: input.method,
      path: input.path,
      status: input.responseStatus,
      weight: input.weight,
    },
  });

  return {
    allowed: true,
    used: used + input.weight,
    remaining: input.quotaPerMinute - used - input.weight,
    resetAt,
  };
}
