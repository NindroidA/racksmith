import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { RackForm } from "@/components/rack/rack-form";
import type { ColorTag } from "@/types";

export default async function EditRackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId } = await requireMember("member");

  const rack = await withTenant(organizationId, (tx) =>
    tx.rack.findFirst({
      where: { id, organizationId },
    }),
  );

  if (!rack) notFound();

  return (
    <RackForm
      mode="edit"
      rackId={rack.id}
      initial={{
        name: rack.name,
        sizeU: rack.sizeU,
        location: rack.location,
        description: rack.description,
        colorTag: rack.colorTag as ColorTag,
      }}
    />
  );
}
