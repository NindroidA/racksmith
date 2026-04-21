import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { SubnetForm } from "@/components/network-tools/subnet-form";
import type { ColorTag } from "@/types";

type Params = { id: string };

export default async function EditSubnetPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const { organizationId } = await requireMember("member");

  const [subnet, others] = await withTenant(organizationId, (tx) =>
    Promise.all([
      tx.subnet.findFirst({
        where: { id, organizationId },
      }),
      tx.subnet.findMany({
        where: { organizationId, NOT: { id } },
        select: { cidr: true },
      }),
    ]),
  );

  if (!subnet) notFound();

  return (
    <SubnetForm
      mode="edit"
      subnetId={subnet.id}
      initial={{
        cidr: subnet.cidr,
        name: subnet.name,
        description: subnet.description,
        gateway: subnet.gateway,
        dnsServers: subnet.dnsServers,
        colorTag: subnet.colorTag as ColorTag,
      }}
      existingCidrs={others.map((o) => o.cidr)}
    />
  );
}
