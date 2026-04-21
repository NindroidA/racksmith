import "server-only";

import { unstable_cache, updateTag } from "next/cache";
import { withTenant } from "@/lib/prisma-tenant";
import { getDashboardSnapshot, type Snapshot } from "./snapshot";
import { evaluateRules } from "./evaluate";
import {
  dismissalKey,
  type DismissalRecord,
  type DismissalSet,
  type Recommendation,
} from "./types";

// Cache TTL — short enough that fresh state surfaces within a minute,
// long enough that a single dashboard load doesn't fan out queries.
const TTL_SECONDS = 60;

function tagFor(organizationId: string): string {
  return `recommendations:${organizationId}`;
}

// Single source of truth for the dismissal table read. Returns BOTH the
// membership Set used by the rule filter AND the rich row list used by the
// /recommendations page sidebar — so the page never re-queries.
async function loadDismissals(
  organizationId: string,
): Promise<{ set: DismissalSet; records: DismissalRecord[] }> {
  const now = new Date();
  const rows = await withTenant(organizationId, (tx) =>
    tx.recommendationDismissal.findMany({
      where: {
        organizationId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { dismissedAt: "desc" },
      select: {
        ruleKey: true,
        entityKey: true,
        expiresAt: true,
        dismissedAt: true,
      },
    }),
  );
  const set: DismissalSet = new Set(
    rows.map((r) => dismissalKey(r.ruleKey, r.entityKey)),
  );
  return { set, records: rows };
}

// Get the cached snapshot — kept separate so a future "preview as if no
// dismissals" view can reuse it.
function getCachedSnapshot(organizationId: string): Promise<Snapshot> {
  return unstable_cache(
    async () => getDashboardSnapshot(organizationId),
    ["recommendations-snapshot", organizationId],
    { tags: [tagFor(organizationId)], revalidate: TTL_SECONDS },
  )();
}

export type RecommendationsResult = {
  recommendations: Recommendation[];
  dismissals: DismissalRecord[];
  capturedAt: number;
};

export async function getRecommendations(
  organizationId: string,
): Promise<RecommendationsResult> {
  const [snapshot, dismissals] = await Promise.all([
    getCachedSnapshot(organizationId),
    loadDismissals(organizationId),
  ]);
  return {
    recommendations: evaluateRules({
      snapshot,
      dismissals: dismissals.set,
    }),
    dismissals: dismissals.records,
    capturedAt: snapshot.capturedAt,
  };
}

// Mutations call this to invalidate the per-organization snapshot cache.
// Uses `updateTag` (Next 16's read-your-own-writes API) so the calling
// server action sees the fresh snapshot on its next read. For non-action
// mutations, the 60 s TTL covers freshness.
export function invalidateRecommendations(organizationId: string): void {
  updateTag(tagFor(organizationId));
}
