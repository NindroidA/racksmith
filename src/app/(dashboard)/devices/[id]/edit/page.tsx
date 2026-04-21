import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { DeviceForm } from "@/components/device/device-form";
import type { DeviceType } from "@/types";

export default async function EditDevicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId } = await requireMember("member");

  const [device, racks] = await withTenant(organizationId, (tx) =>
    Promise.all([
      tx.device.findFirst({
        where: { id, organizationId },
      }),
      tx.rack.findMany({
        where: { organizationId },
        select: { id: true, name: true, sizeU: true },
        orderBy: { name: "asc" },
      }),
    ]),
  );

  if (!device) notFound();

  return (
    <DeviceForm
      mode="edit"
      deviceId={device.id}
      racks={racks}
      initial={{
        name: device.name,
        deviceType: device.deviceType as DeviceType,
        manufacturer: device.manufacturer,
        model: device.model,
        sizeU: device.sizeU,
        portCount: device.portCount,
        powerWatts: device.powerWatts,
        notes: device.notes,
        ipAddress: device.ipAddress,
        macAddress: device.macAddress,
        hostname: device.hostname,
        rackId: device.rackId,
        positionU: device.positionU,
      }}
    />
  );
}
