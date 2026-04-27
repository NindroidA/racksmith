import Link from "next/link";
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
            together · Or use{" "}
            <span className="font-medium text-white/80">Add Connection</span>{" "}
            for keyboard access
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
        <>
          <TopologyCanvas
            devices={canvasDevices}
            connections={canvasConnections}
          />
          <ConnectionsAsText
            devices={canvasDevices}
            connections={canvasConnections}
          />
        </>
      )}
    </div>
  );
}

/** Text-based alternative to the React Flow canvas — keyboard + screen
 *  reader users can review and jump to existing connections without
 *  operating the 2D drag-and-drop surface. */
function ConnectionsAsText({
  devices,
  connections,
}: {
  devices: ReadonlyArray<{ id: string; name: string }>;
  connections: ReadonlyArray<{
    id: string;
    sourceDeviceId: string;
    targetDeviceId: string;
    sourcePort: string;
    targetPort: string;
    cableType: string;
    bandwidth: string | null;
    vlan: string | null;
  }>;
}) {
  const nameById = new Map(devices.map((d) => [d.id, d.name]));
  return (
    <details className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02]">
      <summary className="cursor-pointer px-4 py-2.5 text-sm text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50">
        Connections as text ({connections.length})
      </summary>
      {connections.length === 0 ? (
        <p className="px-4 py-3 text-sm text-white/50">
          No connections yet. Use{" "}
          <span className="font-medium text-white/70">Add Connection</span> on
          the canvas to wire up devices.
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-white/[0.06]">
          <table className="w-full text-sm">
            <caption className="sr-only">
              All topology connections in tabular form
            </caption>
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wider text-white/40">
                <th scope="col" className="px-4 py-2 font-medium">
                  Source
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Source port
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Target
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Target port
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Cable
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Bandwidth
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  VLAN
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {connections.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 text-white">
                    <Link
                      href={`/devices/${c.sourceDeviceId}`}
                      className="hover:text-primary"
                    >
                      {nameById.get(c.sourceDeviceId) ?? c.sourceDeviceId}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-white/70">
                    {c.sourcePort || "—"}
                  </td>
                  <td className="px-4 py-2 text-white">
                    <Link
                      href={`/devices/${c.targetDeviceId}`}
                      className="hover:text-primary"
                    >
                      {nameById.get(c.targetDeviceId) ?? c.targetDeviceId}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-white/70">
                    {c.targetPort || "—"}
                  </td>
                  <td className="px-4 py-2 text-xs capitalize text-white/70">
                    {c.cableType}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-white/60">
                    {c.bandwidth ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-white/60">
                    {c.vlan ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
