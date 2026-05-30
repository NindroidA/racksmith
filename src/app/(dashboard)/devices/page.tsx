import Link from "next/link";
import { Plus, UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import {
  DeviceListClient,
  type DeviceRow,
} from "@/components/device/device-list-client";
import { DeviceEmptyState } from "@/components/device/device-empty-state";

export default async function DevicesPage() {
  const { organizationId } = await requireMember("member");

  const devices = await withTenant(organizationId, (tx) =>
    tx.device.findMany({
      where: { organizationId },
      include: { rack: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  );

  const rows: DeviceRow[] = devices.map((d) => ({
    id: d.id,
    name: d.name,
    deviceType: d.deviceType,
    manufacturer: d.manufacturer,
    model: d.model,
    sizeU: d.sizeU,
    portCount: d.portCount,
    ipAddress: d.ipAddress,
    rackId: d.rackId,
    rackName: d.rack?.name ?? null,
    positionU: d.positionU,
    updatedAt: d.updatedAt,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Devices</h1>
          <p className="mt-1 text-white/60">
            <span className="mono">{devices.length}</span> device
            {devices.length !== 1 ? "s" : ""} in inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/devices/import"
            className="glass-button flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
          >
            <UploadSimple className="h-4 w-4" weight="bold" />
            Import CSV
          </Link>
          <Link
            href="/devices/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" weight="bold" />
            Add Device
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <DeviceEmptyState />
      ) : (
        <DeviceListClient devices={rows} />
      )}
    </div>
  );
}
