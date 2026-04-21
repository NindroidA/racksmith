import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { VlanForm } from "@/components/network-tools/vlan-form";
import type { ColorTag } from "@/types";

type Params = { id: string };

export default async function EditVlanPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const { organizationId } = await requireMember("member");

  const vlan = await withTenant(organizationId, (tx) =>
    tx.vlan.findFirst({
      where: { id, organizationId },
    }),
  );
  if (!vlan) notFound();

  return (
    <VlanForm
      mode="edit"
      vlanRowId={vlan.id}
      initial={{
        vlanId: vlan.vlanId,
        name: vlan.name,
        description: vlan.description,
        colorTag: vlan.colorTag as ColorTag,
        purpose: vlan.purpose as
          | "user"
          | "management"
          | "iot"
          | "guest"
          | "voip"
          | "storage"
          | "other",
      }}
    />
  );
}
