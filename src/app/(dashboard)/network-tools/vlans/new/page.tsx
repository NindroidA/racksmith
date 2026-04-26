import { requireMember } from "@/lib/auth-helpers";
import { canCreateVlan, TIER_LIMITS } from "@/lib/tiers";
import { VlanForm } from "@/components/network-tools/vlan-form";
import { TierLimitBanner } from "@/components/tier/limit-banner";

export default async function NewVlanPage() {
  const { organizationId } = await requireMember("member");

  const check = await canCreateVlan(organizationId);
  if (!check.ok) {
    return (
      <TierLimitBanner
        resource="VLANs"
        planLabel={TIER_LIMITS[check.plan].label}
        current={check.current}
        limit={check.limit}
        backHref="/network-tools/vlans"
        backLabel="Back to VLANs"
      />
    );
  }

  return <VlanForm mode="create" />;
}
