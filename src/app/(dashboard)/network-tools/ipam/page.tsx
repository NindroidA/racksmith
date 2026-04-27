import Link from "next/link";
import { Plus, Network, Lock, Download } from "lucide-react";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { getUsageSummary } from "@/lib/tiers";
import { calculateCidr } from "@/lib/ip";
import { COLOR_TAG_MAP, type ColorTag } from "@/types";
import { IpamEmptyState } from "@/components/network-tools/ipam-empty-state";

export default async function IpamPage() {
  const { organizationId } = await requireMember("member");

  const [subnets, usage] = await Promise.all([
    withTenant(organizationId, (tx) =>
      tx.subnet.findMany({
        where: { organizationId },
        include: {
          _count: { select: { assignments: true, dhcpRanges: true } },
        },
        orderBy: { cidr: "asc" },
      }),
    ),
    getUsageSummary(organizationId),
  ]);

  const subnetLimit = usage.subnets.limit;
  const atLimit = subnetLimit !== null && usage.subnets.current >= subnetLimit;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
            <Network className="h-7 w-7 text-accent-cyan" aria-hidden />
            IP Address Management
          </h1>
          <p className="mt-1 text-white/60">
            {subnets.length} subnet{subnets.length !== 1 ? "s" : ""} tracked
            {subnetLimit !== null && (
              <span className="ml-2 text-white/40">
                · {usage.subnets.current}/{subnetLimit} on {usage.planLabel}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {subnets.length > 0 && (
            <a
              href="/api/ipam/export?format=csv"
              download="racksmith-ipam.csv"
              className="glass-button flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
            >
              <Download className="h-4 w-4" aria-hidden />
              Export CSV
            </a>
          )}
          {atLimit ? (
            <div
              role="status"
              className="flex items-center gap-2 rounded-lg border border-accent-orange/40 bg-accent-orange/10 px-4 py-2.5 text-sm font-medium text-accent-orange"
            >
              <Lock className="h-4 w-4" aria-hidden />
              <span>
                Subnet limit reached ({subnetLimit} on {usage.planLabel})
              </span>
            </div>
          ) : (
            <Link
              href="/network-tools/ipam/new"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add subnet
            </Link>
          )}
        </div>
      </div>

      {subnets.length === 0 ? (
        <IpamEmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subnets.map((s) => {
            const details = safeCalc(s.cidr);
            const color =
              COLOR_TAG_MAP[s.colorTag as ColorTag] ?? COLOR_TAG_MAP.blue;
            const utilization =
              details && details.usableHosts > 0n
                ? Math.min(
                    100,
                    (s._count.assignments / Number(details.usableHosts)) * 100,
                  )
                : 0;
            return (
              <Link key={s.id} href={`/network-tools/ipam/${s.id}`}>
                <div className="glass-card flex flex-col gap-3 rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{s.name}</h3>
                      <p className="font-mono text-xs text-white/50">
                        {s.cidr}
                      </p>
                    </div>
                    <span
                      className="h-2 w-8 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                  </div>
                  {s.description && (
                    <p className="text-sm text-white/60 line-clamp-2">
                      {s.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between text-xs text-white/50">
                    <span>
                      {s._count.assignments} assigned
                      {s._count.dhcpRanges > 0 &&
                        ` · ${s._count.dhcpRanges} DHCP range${s._count.dhcpRanges === 1 ? "" : "s"}`}
                    </span>
                    {details && (
                      <span className="font-mono">
                        {Math.round(utilization)}%
                      </span>
                    )}
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={Math.round(utilization)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${s.name} utilization: ${Math.round(utilization)}%`}
                    className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]"
                  >
                    <div
                      className="h-full rounded-full bg-accent-cyan/60"
                      style={{ width: `${utilization}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function safeCalc(cidr: string) {
  try {
    return calculateCidr(cidr);
  } catch {
    return null;
  }
}
