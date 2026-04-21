import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { DeviceForm } from "@/components/device/device-form";

export default async function NewDevicePage() {
  const { organizationId } = await requireMember("member");

  const racks = await withTenant(organizationId, (tx) =>
    tx.rack.findMany({
      where: { organizationId },
      select: { id: true, name: true, sizeU: true },
      orderBy: { name: "asc" },
    }),
  );

  return <DeviceForm mode="create" racks={racks} />;
}
