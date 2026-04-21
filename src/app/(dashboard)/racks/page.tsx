import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import Link from "next/link";
import { Plus, Lock } from "lucide-react";
import { COLOR_TAG_MAP } from "@/types";
import type { ColorTag } from "@/types";
import { getUsageSummary } from "@/lib/tiers";
import { RackEmptyState } from "@/components/rack/rack-empty-state";

export default async function RacksPage() {
  const { organizationId } = await requireMember("member");

  const [racks, usage] = await Promise.all([
    withTenant(organizationId, (tx) =>
      tx.rack.findMany({
        where: { organizationId },
        include: { _count: { select: { devices: true } } },
        orderBy: { updatedAt: "desc" },
      }),
    ),
    getUsageSummary(organizationId),
  ]);

  const rackLimit = usage.racks.limit;
  const atLimit = rackLimit !== null && usage.racks.current >= rackLimit;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Racks</h1>
          <p className="mt-1 text-white/60">
            {racks.length} rack{racks.length !== 1 ? "s" : ""} configured
            {rackLimit !== null && (
              <span className="ml-2 text-white/40">
                · {usage.racks.current}/{rackLimit} on {usage.planLabel}
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
              Rack limit reached ({rackLimit} on {usage.planLabel})
            </span>
          </div>
        ) : (
          <Link
            href="/racks/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Rack
          </Link>
        )}
      </div>

      {racks.length === 0 ? (
        <RackEmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {racks.map((rack) => {
            const tagColor =
              COLOR_TAG_MAP[rack.colorTag as ColorTag] || COLOR_TAG_MAP.blue;
            return (
              <Link key={rack.id} href={`/racks/${rack.id}`}>
                <div className="glass-card rounded-xl p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div
                      className="h-2 w-8 rounded-full"
                      style={{ backgroundColor: tagColor }}
                    />
                    <span className="text-xs text-white/40">{rack.sizeU}U</span>
                  </div>
                  <h3 className="mb-1 text-lg font-semibold text-white">
                    {rack.name}
                  </h3>
                  {rack.location && (
                    <p className="mb-3 text-sm text-white/50">
                      {rack.location}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <span>{rack._count.devices} devices</span>
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
