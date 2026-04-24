/**
 * Populates the `dev-workspace` org with a realistic mini-infrastructure
 * (2 racks, 8 devices, a subnet/VLAN, a few connections, and a pending
 * discovery scan) so screenshots + local demos look like real data instead
 * of zero-state placeholders. Idempotent — re-running wipes the seeded rows
 * first, then recreates them. Non-production only.
 *
 * Usage:
 *   bun run scripts/seed-dev-samples.ts
 */
import { PrismaClient, type Prisma } from "@prisma/client";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run: NODE_ENV=production.");
  process.exit(1);
}

const prisma = new PrismaClient();

// Inline tenant-scoping helper — tenant-table writes need `app.organization_id`
// set for the post-10g strict RLS policies. Mirrors `withTenant` from
// `src/lib/prisma-tenant.ts` but avoids importing it (that file is gated by
// `server-only`, which doesn't work in a standalone Bun script).
async function asTenant<T>(
  organizationId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.organization_id', ${organizationId}, true)`;
    return fn(tx);
  });
}

const DEV_ORG_SLUG = "dev-workspace";

type DeviceSpec = {
  name: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  sizeU: number;
  portCount: number;
  powerWatts: number | null;
  rackName?: string;
  positionU?: number;
  ipAddress?: string;
  macAddress?: string;
  hostname?: string;
  canvasX?: number;
  canvasY?: number;
};

const RACKS = [
  {
    name: "Main Rack",
    sizeU: 42,
    location: "MDF",
    description: "Primary distribution — core switch + firewall + servers",
    colorTag: "blue",
  },
  {
    name: "Closet A",
    sizeU: 12,
    location: "Suite 200",
    description: "Access layer closet — user-facing switch + UPS",
    colorTag: "cyan",
  },
];

const DEVICES: DeviceSpec[] = [
  {
    name: "fw-edge-01",
    deviceType: "firewall",
    manufacturer: "ubiquiti",
    model: "UDM-Pro",
    sizeU: 1,
    portCount: 10,
    powerWatts: 50,
    rackName: "Main Rack",
    positionU: 42,
    ipAddress: "10.0.0.1",
    macAddress: "f8:9e:28:10:00:01",
    hostname: "fw-edge-01.mgmt.local",
    canvasX: 120,
    canvasY: 80,
  },
  {
    name: "sw-core-01",
    deviceType: "switch",
    manufacturer: "ubiquiti",
    model: "USW-Enterprise-24-PoE",
    sizeU: 1,
    portCount: 24,
    powerWatts: 400,
    rackName: "Main Rack",
    positionU: 40,
    ipAddress: "10.0.0.2",
    macAddress: "f8:9e:28:10:00:02",
    hostname: "sw-core-01.mgmt.local",
    canvasX: 120,
    canvasY: 220,
  },
  {
    name: "sw-core-02",
    deviceType: "switch",
    manufacturer: "ubiquiti",
    model: "USW-Pro-48-PoE",
    sizeU: 1,
    portCount: 48,
    powerWatts: 600,
    rackName: "Main Rack",
    positionU: 39,
    ipAddress: "10.0.0.3",
    macAddress: "f8:9e:28:10:00:03",
    hostname: "sw-core-02.mgmt.local",
    canvasX: 320,
    canvasY: 220,
  },
  {
    name: "srv-app-01",
    deviceType: "server",
    manufacturer: "custom",
    model: "SYS-1019D-FRN5TP",
    sizeU: 1,
    portCount: 2,
    powerWatts: 400,
    rackName: "Main Rack",
    positionU: 36,
    ipAddress: "10.0.0.10",
    macAddress: "0c:c4:7a:aa:00:10",
    hostname: "srv-app-01.prod.local",
    canvasX: 520,
    canvasY: 140,
  },
  {
    name: "srv-app-02",
    deviceType: "server",
    manufacturer: "custom",
    model: "SYS-1019D-FRN5TP",
    sizeU: 1,
    portCount: 2,
    powerWatts: 400,
    rackName: "Main Rack",
    positionU: 34,
    ipAddress: "10.0.0.11",
    macAddress: "0c:c4:7a:aa:00:11",
    hostname: "srv-app-02.prod.local",
    canvasX: 520,
    canvasY: 300,
  },
  {
    name: "ups-main",
    deviceType: "ups",
    manufacturer: "custom",
    model: "APC SMT2200",
    sizeU: 2,
    portCount: 0,
    powerWatts: null,
    rackName: "Main Rack",
    positionU: 1,
    canvasX: 320,
    canvasY: 420,
  },
  {
    name: "sw-access-01",
    deviceType: "switch",
    manufacturer: "ubiquiti",
    model: "USW-24-PoE",
    sizeU: 1,
    portCount: 24,
    powerWatts: 250,
    rackName: "Closet A",
    positionU: 12,
    ipAddress: "10.0.0.4",
    macAddress: "f8:9e:28:10:00:04",
    hostname: "sw-access-01.mgmt.local",
    canvasX: 720,
    canvasY: 220,
  },
  {
    name: "sw-lab-01",
    deviceType: "switch",
    manufacturer: "cisco",
    model: "C9200L-24T",
    sizeU: 1,
    portCount: 24,
    powerWatts: 60,
    hostname: "sw-lab-01.mgmt.local",
    canvasX: 920,
    canvasY: 140,
  },
];

async function main() {
  const org = await prisma.organization.findUnique({
    where: { slug: DEV_ORG_SLUG },
    select: { id: true },
  });
  if (!org) {
    throw new Error(
      `Dev workspace not found (slug=${DEV_ORG_SLUG}). Run "bun run db:seed" first.`,
    );
  }

  const userId = "devuser0000000000000000000000000";

  console.log("Wiping existing sample rows in Dev Workspace…");
  await asTenant(org.id, async (tx) => {
    await tx.connection.deleteMany({ where: { organizationId: org.id } });
    await tx.ipAssignment.deleteMany({ where: { organizationId: org.id } });
    await tx.vlanAssignment.deleteMany({
      where: { organizationId: org.id },
    });
    await tx.dhcpRange.deleteMany({ where: { organizationId: org.id } });
    await tx.device.deleteMany({ where: { organizationId: org.id } });
    await tx.subnet.deleteMany({ where: { organizationId: org.id } });
    await tx.vlan.deleteMany({ where: { organizationId: org.id } });
    await tx.rack.deleteMany({ where: { organizationId: org.id } });
    await tx.discoveryScan.deleteMany({ where: { organizationId: org.id } });
  });

  console.log("Creating racks…");
  const rackByName = new Map<string, string>();
  for (const rack of RACKS) {
    const created = await asTenant(org.id, (tx) =>
      tx.rack.create({
        data: { ...rack, userId, organizationId: org.id },
        select: { id: true, name: true },
      }),
    );
    rackByName.set(created.name, created.id);
  }

  console.log("Creating devices…");
  const deviceByName = new Map<string, string>();
  for (const d of DEVICES) {
    const rackId = d.rackName ? rackByName.get(d.rackName) : null;
    const created = await asTenant(org.id, (tx) =>
      tx.device.create({
        data: {
          userId,
          organizationId: org.id,
          name: d.name,
          deviceType: d.deviceType,
          manufacturer: d.manufacturer,
          model: d.model,
          sizeU: d.sizeU,
          portCount: d.portCount,
          powerWatts: d.powerWatts,
          rackId: rackId ?? null,
          positionU: d.positionU ?? null,
          ipAddress: d.ipAddress ?? null,
          macAddress: d.macAddress ?? null,
          hostname: d.hostname ?? null,
          canvasX: d.canvasX ?? null,
          canvasY: d.canvasY ?? null,
          isManual: true,
        },
        select: { id: true, name: true },
      }),
    );
    deviceByName.set(created.name, created.id);
  }

  console.log("Creating subnet + VLAN…");
  await asTenant(org.id, async (tx) => {
    const vlan = await tx.vlan.create({
      data: {
        userId,
        organizationId: org.id,
        vlanId: 10,
        name: "Management",
        description: "Switch and server mgmt interfaces",
        colorTag: "purple",
        purpose: "management",
      },
      select: { id: true },
    });
    await tx.subnet.create({
      data: {
        userId,
        organizationId: org.id,
        cidr: "10.0.0.0/24",
        name: "Mgmt LAN",
        description: "Primary management network",
        gateway: "10.0.0.1",
        dnsServers: "1.1.1.1, 1.0.0.1",
        colorTag: "blue",
        vlanId: vlan.id,
      },
    });
  });

  console.log("Creating connections…");
  const conns: Array<{
    src: string;
    srcPort: string;
    tgt: string;
    tgtPort: string;
    cableType: string;
    bandwidth: string;
  }> = [
    {
      src: "fw-edge-01",
      srcPort: "9",
      tgt: "sw-core-01",
      tgtPort: "1",
      cableType: "sfp",
      bandwidth: "10G",
    },
    {
      src: "sw-core-01",
      srcPort: "24",
      tgt: "sw-core-02",
      tgtPort: "48",
      cableType: "sfp",
      bandwidth: "10G",
    },
    {
      src: "sw-core-01",
      srcPort: "12",
      tgt: "srv-app-01",
      tgtPort: "eno1",
      cableType: "ethernet",
      bandwidth: "1G",
    },
    {
      src: "sw-core-01",
      srcPort: "13",
      tgt: "srv-app-02",
      tgtPort: "eno1",
      cableType: "ethernet",
      bandwidth: "1G",
    },
    {
      src: "sw-core-02",
      srcPort: "47",
      tgt: "sw-access-01",
      tgtPort: "24",
      cableType: "sfp",
      bandwidth: "10G",
    },
  ];
  await asTenant(org.id, async (tx) => {
    for (const c of conns) {
      const srcId = deviceByName.get(c.src);
      const tgtId = deviceByName.get(c.tgt);
      if (!srcId || !tgtId) {
        throw new Error(
          `Connection references unknown device(s): src="${c.src}" (${srcId ? "found" : "missing"}), tgt="${c.tgt}" (${tgtId ? "found" : "missing"})`,
        );
      }
      await tx.connection.create({
        data: {
          userId,
          organizationId: org.id,
          sourceDeviceId: srcId,
          sourcePort: c.srcPort,
          targetDeviceId: tgtId,
          targetPort: c.tgtPort,
          cableType: c.cableType,
          bandwidth: c.bandwidth,
        },
      });
    }
  });

  console.log("Creating a completed discovery scan with pending hosts…");
  const pendingHosts = [
    {
      ip: "10.0.0.40",
      hostname: "printer-mdf.local",
      mac: "d4:3d:7e:01:01:40",
      vendor: "Brother",
      osGuess: "Linux",
      openPorts: [631, 9100],
      status: "up",
      match: { kind: "new" },
      typeGuess: "other",
      actionState: "pending",
    },
    {
      ip: "10.0.0.51",
      hostname: "pi-monitoring.local",
      mac: "b8:27:eb:00:11:51",
      vendor: "Raspberry Pi Foundation",
      osGuess: "Raspbian",
      openPorts: [22, 80, 3000],
      status: "up",
      match: { kind: "new" },
      typeGuess: "server",
      actionState: "pending",
    },
    {
      ip: "10.0.0.77",
      hostname: "iot-doorbell.local",
      mac: "00:0e:c6:aa:bb:cc",
      vendor: "Samsung",
      osGuess: "Linux embedded",
      openPorts: [80, 443],
      status: "up",
      match: { kind: "new" },
      typeGuess: "other",
      actionState: "pending",
    },
  ];
  await asTenant(org.id, (tx) =>
    tx.discoveryScan.create({
      data: {
        userId,
        organizationId: org.id,
        subnet: "10.0.0.0/24",
        status: "completed",
        startedAt: new Date(Date.now() - 1000 * 60 * 30),
        completedAt: new Date(Date.now() - 1000 * 60 * 29),
        duration: 54,
        hostsFound: 3,
        hostsNew: 3,
        hostsKnown: 0,
        results: { hosts: pendingHosts },
      },
    }),
  );

  const counts = await asTenant(org.id, (tx) =>
    Promise.all([
      tx.rack.count({ where: { organizationId: org.id } }),
      tx.device.count({ where: { organizationId: org.id } }),
      tx.connection.count({ where: { organizationId: org.id } }),
      tx.subnet.count({ where: { organizationId: org.id } }),
    ]),
  );

  console.log("");
  console.log(
    `✓ Dev Workspace populated — ${counts[0]} racks, ${counts[1]} devices, ${counts[2]} connections, ${counts[3]} subnets.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
