import { Radar } from "lucide-react";
import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/prisma-tenant";
import { ScanStarter } from "@/components/discovery/scan-starter";
import { ActiveScanCard } from "@/components/discovery/active-scan-card";
import {
  PendingDevicesTable,
  type PendingHost,
  type InventoryOption,
} from "@/components/discovery/pending-devices-table";
import {
  ScanHistory,
  type ScanHistoryRow,
} from "@/components/discovery/scan-history";

export default async function DiscoveryPage() {
  const { session, organizationId } = await requireMember("member");

  const [[scans, devices], settings] = await Promise.all([
    withTenant(organizationId, (tx) =>
      Promise.all([
        tx.discoveryScan.findMany({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        tx.device.findMany({
          where: { organizationId },
          select: {
            id: true,
            name: true,
            manufacturer: true,
            deviceType: true,
          },
          orderBy: { name: "asc" },
        }),
      ]),
    ),
    prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  const activeScan = scans.find(
    (s) => s.status === "running" || s.status === "pending",
  );

  // Aggregate all pending hosts across recent completed scans
  type HostJson = {
    ip: string;
    hostname: string | null;
    mac: string | null;
    osGuess: string | null;
    openPorts: number[];
    typeGuess: string;
    match:
      | { kind: "known"; deviceId: string; deviceName: string }
      | { kind: "new" };
    actionState: "pending" | "approved" | "assigned" | "ignored";
  };

  const pendingHosts: PendingHost[] = [];
  for (const scan of scans) {
    if (scan.status !== "completed") continue;
    const results = scan.results as { hosts?: HostJson[] } | null;
    if (!results?.hosts) continue;

    for (const host of results.hosts) {
      if (host.actionState !== "pending") continue;
      if (host.match.kind === "known") continue; // already known, skip from pending
      pendingHosts.push({
        ...host,
        scanId: scan.id,
        scanSubnet: scan.subnet,
      });
    }
  }

  const inventoryOptions: InventoryOption[] = devices;

  const historyRows: ScanHistoryRow[] = scans.map((s) => ({
    id: s.id,
    subnet: s.subnet,
    status: s.status,
    hostsFound: s.hostsFound,
    hostsNew: s.hostsNew,
    hostsKnown: s.hostsKnown,
    duration: s.duration,
    error: s.error,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
  }));

  const defaultSubnet = settings?.defaultSubnet ?? undefined;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Auto-Discovery</h1>
          <p className="mt-1 text-white/60">
            Scan your network with nmap to find devices automatically
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
          <Radar className="h-3.5 w-3.5" />
          <span>
            {scans.length} scan{scans.length !== 1 ? "s" : ""} ·{" "}
            {pendingHosts.length} pending
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {activeScan && activeScan.startedAt && (
          <ActiveScanCard
            scanId={activeScan.id}
            subnet={activeScan.subnet}
            startedAt={activeScan.startedAt}
          />
        )}

        <ScanStarter defaultSubnet={defaultSubnet} disabled={!!activeScan} />

        <section aria-labelledby="discovery-pending-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="discovery-pending-heading"
              className="text-sm font-semibold uppercase tracking-wider text-white/50"
            >
              Pending devices
            </h2>
            <span className="text-xs text-white/40">
              {pendingHosts.length} waiting for action
            </span>
          </div>
          <PendingDevicesTable
            hosts={pendingHosts}
            devices={inventoryOptions}
          />
        </section>

        <section aria-labelledby="discovery-history-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="discovery-history-heading"
              className="text-sm font-semibold uppercase tracking-wider text-white/50"
            >
              Scan history
            </h2>
            <span className="text-xs text-white/40">Last 20 scans</span>
          </div>
          <ScanHistory scans={historyRows} />
        </section>
      </div>
    </div>
  );
}
