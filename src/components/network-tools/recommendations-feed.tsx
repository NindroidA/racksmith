import Link from "next/link";
import { Bell } from "@phosphor-icons/react/dist/ssr";
import { bySeverity, type Recommendation } from "@/lib/recommendations/types";
import { RecommendationCard } from "./recommendation-card";

type Props = {
  recommendations: ReadonlyArray<Recommendation>;
  /** Optional max items to render in the feed (e.g. dashboard widget). */
  maxItems?: number;
  /** Show a "View all" link to the full recommendations page. */
  showViewAll?: boolean;
  emptyMessage?: string;
};

export function RecommendationsFeed({
  recommendations,
  maxItems,
  showViewAll = false,
  emptyMessage = "No recommendations right now. We'll surface anything that needs attention here.",
}: Props) {
  const visible =
    typeof maxItems === "number"
      ? recommendations.slice(0, maxItems)
      : recommendations;
  const buckets = bySeverity(visible);
  const hasAny = visible.length > 0;

  return (
    <section>
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold txt-strong">
          <Bell weight="duotone" className="h-4 w-4 text-primary" aria-hidden />
          Recommendations
          {hasAny && (
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-normal text-white/60">
              {recommendations.length}
            </span>
          )}
        </h2>
        {showViewAll && hasAny && (
          <Link
            href="/network-tools/recommendations"
            className="text-xs text-white/50 transition-colors hover:text-white"
          >
            View all →
          </Link>
        )}
      </header>

      {!hasAny ? (
        <div className="surface-card flex items-center justify-center gap-2 p-6 text-center text-sm txt-body">
          <span className="led-dot led-dot--green" aria-hidden />
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {(["critical", "warning", "info"] as const).map((sev) =>
            buckets[sev].length > 0 ? (
              <div key={sev}>
                <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {sev}
                </div>
                <div className="space-y-2">
                  {buckets[sev].map((rec) => (
                    <RecommendationCard
                      key={`${rec.ruleKey}-${rec.entityKey}`}
                      recommendation={rec}
                    />
                  ))}
                </div>
              </div>
            ) : null,
          )}
          {typeof maxItems === "number" &&
            recommendations.length > maxItems && (
              <p className="px-1 pt-1 text-xs text-white/40">
                {recommendations.length - maxItems} more not shown.
              </p>
            )}
        </div>
      )}
    </section>
  );
}
