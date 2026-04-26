import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { canCreateSubnet, TIER_LIMITS } from "@/lib/tiers";
import { SubnetForm } from "@/components/network-tools/subnet-form";
import { TierLimitBanner } from "@/components/tier/limit-banner";

export default async function NewSubnetPage() {
  const { organizationId } = await requireMember("member");

  const check = await canCreateSubnet(organizationId);
  if (!check.ok) {
    return (
      <TierLimitBanner
        resource="subnets"
        planLabel={TIER_LIMITS[check.plan].label}
        current={check.current}
        limit={check.limit}
        backHref="/network-tools/ipam"
        backLabel="Back to IPAM"
      />
    );
  }

  const existing = await withTenant(organizationId, (tx) =>
    tx.subnet.findMany({
      where: { organizationId },
      select: { cidr: true },
    }),
  );

  return (
    <SubnetForm mode="create" existingCidrs={existing.map((s) => s.cidr)} />
  );
}
