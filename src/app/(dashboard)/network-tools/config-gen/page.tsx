import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { ConfigGenClient } from "@/components/network-tools/config-gen-client";

export default async function ConfigGenPage() {
  const { organizationId } = await requireMember("member");

  const [devices, vlans] = await withTenant(organizationId, (tx) =>
    Promise.all([
      tx.device.findMany({
        where: {
          organizationId,
          deviceType: { in: ["switch", "router", "firewall"] },
        },
        select: {
          id: true,
          name: true,
          manufacturer: true,
          model: true,
          portCount: true,
        },
        orderBy: { name: "asc" },
      }),
      tx.vlan.findMany({
        where: { organizationId },
        include: {
          assignments: {
            select: {
              deviceId: true,
              portNumber: true,
              mode: true,
              tagged: true,
            },
          },
        },
        orderBy: { vlanId: "asc" },
      }),
    ]),
  );

  const payload = {
    devices,
    vlans: vlans.map((v) => ({
      id: v.id,
      vlanId: v.vlanId,
      name: v.name,
      description: v.description,
      purpose: v.purpose,
      assignments: v.assignments,
    })),
  };

  return <ConfigGenClient devices={payload.devices} vlans={payload.vlans} />;
}
