import "server-only";

import { withTenant } from "@/lib/prisma-tenant";

// One round-trip per dashboard load. Every rule reads from this snapshot —
// no rule should ever issue its own query. Fields are kept narrow on
// purpose so the wire payload stays small (assignment counts come back as
// `_count` aggregates, not full row sets).
export type Snapshot = {
  organizationId: string;
  capturedAt: number;
  racks: ReadonlyArray<{
    id: string;
    name: string;
    sizeU: number;
    deviceFillU: number;
  }>;
  devices: ReadonlyArray<{
    id: string;
    name: string;
    deviceType: string;
    sizeU: number;
    portCount: number;
    powerWatts: number | null;
    rackId: string | null;
  }>;
  connections: ReadonlyArray<{
    sourceDeviceId: string;
    targetDeviceId: string;
  }>;
  subnets: ReadonlyArray<{
    id: string;
    cidr: string;
    name: string;
    assignmentCount: number;
    dhcpRanges: ReadonlyArray<{ startIp: string; endIp: string }>;
    dhcpAssignmentCount: number;
  }>;
  vlans: ReadonlyArray<{
    id: string;
    vlanId: number;
    name: string;
    assignmentCount: number;
  }>;
};

export async function getDashboardSnapshot(
  organizationId: string,
): Promise<Snapshot> {
  const [racks, devices, connections, subnets, vlans] = await withTenant(
    organizationId,
    (tx) =>
      Promise.all([
        tx.rack.findMany({
          where: { organizationId },
          select: {
            id: true,
            name: true,
            sizeU: true,
            devices: { select: { sizeU: true } },
          },
        }),
        tx.device.findMany({
          where: { organizationId },
          select: {
            id: true,
            name: true,
            deviceType: true,
            sizeU: true,
            portCount: true,
            powerWatts: true,
            rackId: true,
          },
        }),
        tx.connection.findMany({
          where: { organizationId },
          select: { sourceDeviceId: true, targetDeviceId: true },
        }),
        // Use `_count` for the total assignment tally (cheap aggregate),
        // and only pull DHCP-status rows for the secondary count. Avoids
        // wire-transferring every assignment just to call `.length`.
        tx.subnet.findMany({
          where: { organizationId },
          select: {
            id: true,
            cidr: true,
            name: true,
            dhcpRanges: { select: { startIp: true, endIp: true } },
            _count: { select: { assignments: true } },
            assignments: {
              where: { status: "dhcp" },
              select: { id: true },
            },
          },
        }),
        tx.vlan.findMany({
          where: { organizationId },
          select: {
            id: true,
            vlanId: true,
            name: true,
            _count: { select: { assignments: true } },
          },
        }),
      ]),
  );

  return {
    organizationId,
    capturedAt: Date.now(),
    racks: racks.map((r) => ({
      id: r.id,
      name: r.name,
      sizeU: r.sizeU,
      deviceFillU: r.devices.reduce((sum, d) => sum + (d.sizeU ?? 0), 0),
    })),
    devices: devices.map((d) => ({
      id: d.id,
      name: d.name,
      deviceType: d.deviceType,
      sizeU: d.sizeU,
      portCount: d.portCount,
      powerWatts: d.powerWatts,
      rackId: d.rackId,
    })),
    connections,
    subnets: subnets.map((s) => ({
      id: s.id,
      cidr: s.cidr,
      name: s.name,
      assignmentCount: s._count.assignments,
      dhcpRanges: s.dhcpRanges,
      dhcpAssignmentCount: s.assignments.length,
    })),
    vlans: vlans.map((v) => ({
      id: v.id,
      vlanId: v.vlanId,
      name: v.name,
      assignmentCount: v._count.assignments,
    })),
  };
}
