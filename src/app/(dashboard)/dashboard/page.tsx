import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import Link from "next/link";
import { Server, HardDrive, Network, Zap, Globe } from "lucide-react";
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
    icon: Server,
    color: "text-accent-blue",
  },
  {
    key: "devices" as const,
    label: "Devices",
    icon: HardDrive,
    color: "text-accent-purple",
  },
  {
    key: "connections" as const,
    label: "Connections",
    icon: Network,
    color: "text-accent-cyan",
  },
  {
    key: "powerWatts" as const,
    label: "Est. Power (W)",
    icon: Zap,
    color: "text-accent-orange",
  },
] as const;

export default async function DashboardPage() {
  const { session, organizationId } = await requireMember("member");
  const stats = await getStats(organizationId);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-white/60">
          Welcome back, {session.user.name || "there"}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/60">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    {stats[card.key].toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-white/[0.06] p-3">
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Network tools summary */}
      <Link
        href="/network-tools/ipam"
        className="glass-card mt-6 flex items-center gap-4 rounded-xl p-5"
      >
        <div className="rounded-lg bg-accent-cyan/20 p-3">
          <Globe className="h-5 w-5 text-accent-cyan" aria-hidden />
        </div>
        <div className="flex-1">
          <p className="font-medium text-white">Network Tools</p>
          <p className="text-sm text-white/50">
            {stats.subnets} subnet{stats.subnets !== 1 ? "s" : ""} ·{" "}
            {stats.ipAssignments} IP{stats.ipAssignments !== 1 ? "s" : ""}{" "}
            assigned
          </p>
        </div>
        <span className="text-xs text-white/30">Manage →</span>
      </Link>

      {/* Recommendations + Activity */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <RecommendationsWidget organizationId={organizationId} />
        <ActivityFeed organizationId={organizationId} />
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/racks/new"
            className="glass-card flex items-center gap-4 rounded-xl p-5"
          >
            <div className="rounded-lg bg-accent-blue/20 p-3">
              <Server className="h-5 w-5 text-accent-blue" aria-hidden />
            </div>
            <div>
              <p className="font-medium text-white">Add Rack</p>
              <p className="text-sm text-white/50">
                Create a new rack configuration
              </p>
            </div>
          </Link>
          <Link
            href="/devices/new"
            className="glass-card flex items-center gap-4 rounded-xl p-5"
          >
            <div className="rounded-lg bg-accent-purple/20 p-3">
              <HardDrive className="h-5 w-5 text-accent-purple" aria-hidden />
            </div>
            <div>
              <p className="font-medium text-white">Add Device</p>
              <p className="text-sm text-white/50">
                Add a device to your inventory
              </p>
            </div>
          </Link>
          <Link
            href="/discovery"
            className="glass-card flex items-center gap-4 rounded-xl p-5"
          >
            <div className="rounded-lg bg-accent-cyan/20 p-3">
              <Network className="h-5 w-5 text-accent-cyan" aria-hidden />
            </div>
            <div>
              <p className="font-medium text-white">Scan Network</p>
              <p className="text-sm text-white/50">
                Discover devices on your network
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
