import { requireMember } from "@/lib/auth-helpers";
import { RackForm } from "@/components/rack/rack-form";
import { canCreateRack, TIER_LIMITS } from "@/lib/tiers";
import { TierLimitBanner } from "@/components/tier/limit-banner";

export default async function NewRackPage() {
  const { organizationId } = await requireMember("member");

  const check = await canCreateRack(organizationId);
  if (!check.ok) {
    return (
      <TierLimitBanner
        resource="racks"
        planLabel={TIER_LIMITS[check.plan].label}
        current={check.current}
        limit={check.limit}
        backHref="/racks"
        backLabel="Back to racks"
      />
    );
  }

  return <RackForm mode="create" />;
}
