import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import Link from "next/link";
import {
  Stack,
  HardDrives,
  ShareNetwork,
  Lightning,
  Globe,
  Pulse,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { RecommendationsWidget } from "@/components/dashboard/recommendations-widget";

async function getStats(organizationId: string) {
  const [
    rackCount,
    deviceCount,
    connectionCount,
    totalPower,
    subnetCount,
    assignmentCount,
  ] = await withTenant(organizationId, (tx) =>
    Promise.all([
      tx.rack.count({ where: { organizationId } }),
      tx.device.count({ where: { organizationId } }),
      tx.connection.count({ where: { organizationId } }),
      tx.device.aggregate({
        where: { organizationId, powerWatts: { not: null } },
        _sum: { powerWatts: true },
      }),
      tx.subnet.count({ where: { organizationId } }),
      tx.ipAssignment.count({ where: { organizationId } }),
    ]),
  );

  return {
    racks: rackCount,
    devices: deviceCount,
    connections: connectionCount,
    powerWatts: totalPower._sum.powerWatts ?? 0,
    subnets: subnetCount,
    ipAssignments: assignmentCount,
  };
}

const STAT_CARDS = [
  {
    key: "racks" as const,
    label: "Racks",
    icon: Stack,
    color: "text-accent-blue",
  },
  {
    key: "devices" as const,
    label: "Devices",
    icon: HardDrives,
    color: "text-accent-purple",
  },
  {
    key: "connections" as const,
    label: "Connections",
    icon: ShareNetwork,
    color: "text-accent-cyan",
  },
  {
    key: "powerWatts" as const,
    label: "Est. Power (W)",
    icon: Lightning,
    color: "text-accent-orange",
  },
] as const;

export default async function DashboardPage() {
  const { session, organizationId } = await requireMember("member");
  const stats = await getStats(organizationId);

  return (
    <div>
      {/* Header — clean material card. */}
      <header className="surface-card mb-6 px-6 py-5">
        <h1 className="text-3xl font-bold txt-strong">Dashboard</h1>
        <p className="mt-1.5 txt-body">
          Welcome back, {session.user.name || "there"}
        </p>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium txt-muted">{card.label}</p>
                  <p className="mono mt-2 text-3xl font-semibold txt-strong">
                    {stats[card.key].toLocaleString()}
                  </p>
                </div>
                <div className="rounded-[10px] bg-white/[0.04] p-2.5 ring-1 ring-inset ring-white/[0.06]">
                  <Icon
                    weight="duotone"
                    className={`h-6 w-6 ${card.color}`}
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Network tools summary */}
      <Link
        href="/ipam"
        className="surface-card surface-interactive mt-5 flex items-center gap-4 p-5"
      >
        <div className="rounded-[10px] bg-accent-cyan/12 p-3 ring-1 ring-inset ring-accent-cyan/20">
          <Globe
            weight="duotone"
            className="h-5 w-5 text-accent-cyan"
            aria-hidden
          />
        </div>
        <div className="flex-1">
          <p className="font-medium txt-strong">Network Tools</p>
          <p className="text-sm txt-muted">
            <span className="mono">{stats.subnets}</span> subnet
            {stats.subnets !== 1 ? "s" : ""} ·{" "}
            <span className="mono">{stats.ipAssignments}</span> IP
            {stats.ipAssignments !== 1 ? "s" : ""} assigned
          </p>
        </div>
        <ArrowRight weight="bold" className="h-4 w-4 txt-faint" aria-hidden />
      </Link>

      {/* Recommendations + Activity */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <RecommendationsWidget organizationId={organizationId} />
        <ActivityFeed organizationId={organizationId} />
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold txt-strong">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/racks/new"
            className="surface-card surface-interactive flex items-center gap-4 p-5"
          >
            <div className="rounded-[10px] bg-accent-blue/12 p-3 ring-1 ring-inset ring-accent-blue/20">
              <Stack
                weight="duotone"
                className="h-5 w-5 text-accent-blue"
                aria-hidden
              />
            </div>
            <div>
              <p className="font-medium txt-strong">Add Rack</p>
              <p className="text-sm txt-muted">
                Create a new rack configuration
              </p>
            </div>
          </Link>
          <Link
            href="/devices/new"
            className="surface-card surface-interactive flex items-center gap-4 p-5"
          >
            <div className="rounded-[10px] bg-accent-purple/12 p-3 ring-1 ring-inset ring-accent-purple/20">
              <HardDrives
                weight="duotone"
                className="h-5 w-5 text-accent-purple"
                aria-hidden
              />
            </div>
            <div>
              <p className="font-medium txt-strong">Add Device</p>
              <p className="text-sm txt-muted">
                Add a device to your inventory
              </p>
            </div>
          </Link>
          <Link
            href="/discovery"
            className="surface-card surface-interactive flex items-center gap-4 p-5"
          >
            <div className="rounded-[10px] bg-accent-cyan/12 p-3 ring-1 ring-inset ring-accent-cyan/20">
              <Pulse
                weight="duotone"
                className="h-5 w-5 text-accent-cyan"
                aria-hidden
              />
            </div>
            <div>
              <p className="font-medium txt-strong">Scan Network</p>
              <p className="text-sm txt-muted">
                Discover devices on your network
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
