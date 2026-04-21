import Link from "next/link";
import { Plus, Lock, Tag } from "lucide-react";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { getUsageSummary } from "@/lib/tiers";
import { COLOR_TAG_MAP, type ColorTag } from "@/types";
import { VlanMatrix } from "@/components/network-tools/vlan-matrix";
import { VlanTemplateApplier } from "@/components/network-tools/vlan-template-applier";

export default async function VlansPage() {
  const { organizationId } = await requireMember("member");

  const [[vlans, switches], usage] = await Promise.all([
    withTenant(organizationId, (tx) =>
      Promise.all([
        tx.vlan.findMany({
          where: { organizationId },
          include: {
            _count: { select: { assignments: true, subnets: true } },
            assignments: {
              select: {
                deviceId: true,
                mode: true,
              },
            },
          },
          orderBy: { vlanId: "asc" },
        }),
        tx.device.findMany({
          where: {
            organizationId,
            deviceType: { in: ["switch", "router", "firewall"] },
          },
          select: {
            id: true,
            name: true,
            deviceType: true,
            manufacturer: true,
            portCount: true,
          },
          orderBy: { name: "asc" },
        }),
      ]),
    ),
    getUsageSummary(organizationId),
  ]);

  const limit = usage.vlans.limit;
  const atLimit = limit !== null && usage.vlans.current >= limit;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
            <Tag className="h-7 w-7 text-accent-purple" aria-hidden />
            VLANs
          </h1>
          <p className="mt-1 text-white/60">
            {vlans.length} VLAN{vlans.length !== 1 ? "s" : ""} defined
            {limit !== null && (
              <span className="ml-2 text-white/40">
                · {usage.vlans.current}/{limit} on {usage.planLabel}
              </span>
            )}
          </p>
        </div>
        {atLimit ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-accent-orange/40 bg-accent-orange/10 px-4 py-2.5 text-sm font-medium text-accent-orange"
          >
            <Lock className="h-4 w-4" aria-hidden />
            <span>
              VLAN limit reached ({limit} on {usage.planLabel})
            </span>
          </div>
        ) : (
          <Link
            href="/network-tools/vlans/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add VLAN
          </Link>
        )}
      </div>

      {vlans.length === 0 ? (
        <>
          <EmptyState />
          <VlanTemplateApplier />
        </>
      ) : (
        <>
          <VlanMatrix
            vlans={vlans.map((v) => ({
              id: v.id,
              vlanId: v.vlanId,
              name: v.name,
              colorTag: v.colorTag,
              purpose: v.purpose,
              subnetCount: v._count.subnets,
              assignmentCount: v._count.assignments,
              deviceIds: Array.from(
                new Set(v.assignments.map((a) => a.deviceId)),
              ),
            }))}
            switches={switches}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {vlans.map((v) => {
              const color =
                COLOR_TAG_MAP[v.colorTag as ColorTag] ?? COLOR_TAG_MAP.purple;
              return (
                <Link key={v.id} href={`/network-tools/vlans/${v.id}`}>
                  <div className="glass-card flex flex-col gap-2 rounded-xl p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span
                          className="rounded-md px-2 py-0.5 font-mono text-xs"
                          style={{
                            backgroundColor: `${color}22`,
                            color,
                          }}
                        >
                          VLAN {v.vlanId}
                        </span>
                        <h3 className="mt-2 font-semibold text-white">
                          {v.name}
                        </h3>
                      </div>
                      <span className="text-xs uppercase tracking-wider text-white/40">
                        {v.purpose}
                      </span>
                    </div>
                    {v.description && (
                      <p className="text-sm text-white/60 line-clamp-2">
                        {v.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between text-xs text-white/50">
                      <span>
                        {v._count.assignments} device
                        {v._count.assignments !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {v._count.subnets} subnet
                        {v._count.subnets !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card flex flex-col items-center rounded-2xl px-6 py-16 text-center">
      <div className="mb-4 rounded-xl bg-accent-purple/20 p-4 text-accent-purple">
        <Tag className="h-8 w-8" aria-hidden />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-white">No VLANs yet</h2>
      <p className="mb-6 max-w-md text-sm text-white/50">
        Define VLANs to segment your network. Link them to subnets in IPAM, then
        assign them to switches to see coverage gaps.
      </p>
      <Link
        href="/network-tools/vlans/new"
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add your first VLAN
      </Link>
    </div>
  );
}
