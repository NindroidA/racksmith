import { requireMember } from "@/lib/auth-helpers";
import { getRecommendations } from "@/lib/recommendations/cache";
import { RecommendationsFeed } from "@/components/network-tools/recommendations-feed";
import { RecommendationCard } from "@/components/network-tools/recommendation-card";
import type { Recommendation } from "@/lib/recommendations/types";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const { organizationId } = await requireMember("member");
  // Single load: snapshot + active dismissals (rich rows) come from one
  // composite call. The page no longer issues its own dismissal query.
  const { recommendations, dismissals, capturedAt } =
    await getRecommendations(organizationId);

  // Render dismissed items as info-severity cards so the UI is consistent.
  const dismissedShells: Recommendation[] = dismissals.map((d) => ({
    ruleKey: d.ruleKey,
    entityKey: d.entityKey,
    severity: "info",
    title: `Dismissed: ${d.ruleKey} for ${d.entityKey}`,
    detail: d.expiresAt
      ? `Snoozed until ${d.expiresAt.toLocaleString()}.`
      : "Dismissed permanently. Restore to bring it back.",
  }));

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Recommendations</h1>
        <p className="mt-1 text-sm text-white/60">
          Capacity + configuration alerts derived from your inventory. Snapshot
          from {new Date(capturedAt).toLocaleTimeString()}.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <RecommendationsFeed recommendations={recommendations} />
        </div>

        <aside>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">
            Dismissed ({dismissedShells.length})
          </h2>
          {dismissedShells.length === 0 ? (
            <p className="text-xs text-white/50">
              Nothing dismissed yet. Use the X / clock icons on a card to
              dismiss or snooze.
            </p>
          ) : (
            <div className="space-y-2">
              {dismissedShells.map((rec) => (
                <RecommendationCard
                  key={`${rec.ruleKey}-${rec.entityKey}`}
                  recommendation={rec}
                  dismissed
                />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
