import { getRecommendations } from "@/lib/recommendations/cache";
import { RecommendationsFeed } from "@/components/network-tools/recommendations-feed";

const MAX_DASHBOARD_ITEMS = 4;

export async function RecommendationsWidget({
  organizationId,
}: {
  organizationId: string;
}) {
  const { recommendations } = await getRecommendations(organizationId);
  return (
    <RecommendationsFeed
      recommendations={recommendations}
      maxItems={MAX_DASHBOARD_ITEMS}
      showViewAll
      emptyMessage="All clear — no capacity, power, or VLAN issues to flag."
    />
  );
}
