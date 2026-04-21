import { Network } from "lucide-react";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { TopologyCanvas } from "@/components/topology/topology-canvas";
import { EmptyStateWithTemplate } from "@/components/ui/empty-state-with-template";

export default async function TopologyPage() {
  const { organizationId } = await requireMember("member");

  const [devices, connections] = await withTenant(organizationId, (tx) =>
    Promise.all([
      tx.device.findMany({
        where: { organizationId },
        include: { rack: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
      tx.connection.findMany({
        where: { organizationId },
        orderBy: { createdAt: "asc" },
      }),
    ]),
  );

  const canvasDevices = devices.map((d) => ({
    id: d.id,
    name: d.name,
    deviceType: d.deviceType,
    manufacturer: d.manufacturer,
    model: d.model,
    sizeU: d.sizeU,
    portCount: d.portCount,
    ipAddress: d.ipAddress,
    rackName: d.rack?.name ?? null,
    canvasX: d.canvasX,
    canvasY: d.canvasY,
  }));

  const canvasConnections = connections.map((c) => ({
    id: c.id,
    sourceDeviceId: c.sourceDeviceId,
    targetDeviceId: c.targetDeviceId,
    sourcePort: c.sourcePort,
    targetPort: c.targetPort,
    cableType: c.cableType,
    bandwidth: c.bandwidth,
    vlan: c.vlan,
    description: c.description,
  }));

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Network Topology</h1>
          <p className="mt-1 text-white/60">
            Drag nodes to rearrange · Drag between handles to wire devices
            together
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
          <Network className="h-3.5 w-3.5" />
          <span>
            {devices.length} device{devices.length !== 1 ? "s" : ""} ·{" "}
            {connections.length} connection
            {connections.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {devices.length === 0 ? (
        <EmptyStateWithTemplate
          icon={<Network className="h-8 w-8" />}
          iconClassName="bg-accent-cyan/20 text-accent-cyan"
          title="Nothing to wire up yet"
          blurb="Add devices to your inventory first, then come back here to connect them on the canvas."
          blankHref="/devices/new"
          blankLabel="Add Device"
          secondaryHref="/discovery"
          secondaryLabel="Scan Network"
        />
      ) : (
        <TopologyCanvas
          devices={canvasDevices}
          connections={canvasConnections}
        />
      )}
    </div>
  );
}
