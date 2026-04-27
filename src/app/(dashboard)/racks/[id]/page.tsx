import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ArrowLeft, MapPin, Zap, HardDrive } from "lucide-react";
import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/prisma-tenant";
import { RackBuilder } from "@/components/rack/rack-builder";
import { COLOR_TAG_MAP } from "@/types";
import type { ColorTag } from "@/types";

export default async function RackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId } = await requireMember("member");

  const [rack, unracked] = await withTenant(organizationId, (tx) =>
    Promise.all([
      tx.rack.findFirst({
        where: { id, organizationId },
        include: {
          devices: {
            where: { positionU: { not: null } },
            orderBy: { positionU: "desc" },
          },
        },
      }),
      tx.device.findMany({
        where: { organizationId, rackId: null },
        select: {
          id: true,
          name: true,
          deviceType: true,
          manufacturer: true,
          model: true,
          sizeU: true,
          portCount: true,
        },
        orderBy: { name: "asc" },
      }),
    ]),
  );

  if (!rack) notFound();

  const catalog = await prisma.deviceCatalog.findMany({
    select: {
      id: true,
      name: true,
      manufacturer: true,
      model: true,
      deviceType: true,
      sizeU: true,
      portCount: true,
      powerWatts: true,
    },
    orderBy: [{ manufacturer: "asc" }, { name: "asc" }],
  });

  const tagColor =
    COLOR_TAG_MAP[rack.colorTag as ColorTag] || COLOR_TAG_MAP.blue;

  const usedU = rack.devices.reduce((sum, d) => sum + d.sizeU, 0);
  const utilizationPct = Math.round((usedU / rack.sizeU) * 100);
  const powerWatts = rack.devices.reduce(
    (sum, d) => sum + (d.powerWatts ?? 0),
    0,
  );

  const visualizerDevices = rack.devices
    .filter((d): d is typeof d & { positionU: number } => d.positionU !== null)
    .map((d) => ({
      id: d.id,
      name: d.name,
      deviceType: d.deviceType,
      manufacturer: d.manufacturer,
      model: d.model,
      sizeU: d.sizeU,
      positionU: d.positionU,
      portCount: d.portCount,
    }));

  return (
    <div>
      <Link
        href="/racks"
        className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        All Racks
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <span
              className="h-3 w-3 rounded-full ring-2 ring-white/10"
              style={{ backgroundColor: tagColor }}
            />
            <h1 className="truncate text-3xl font-bold text-white">
              {rack.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-4 w-4" />
              {rack.sizeU}U rack
            </span>
            {rack.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {rack.location}
              </span>
            )}
            {powerWatts > 0 && (
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                {powerWatts}W
              </span>
            )}
          </div>
          {rack.description && (
            <p className="mt-2 max-w-2xl text-sm text-white/50">
              {rack.description}
            </p>
          )}
        </div>
        <Link
          href={`/racks/${rack.id}/edit`}
          className="glass-button flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      </div>

      {/* Utilization bar */}
      <div className="mb-6 glass-card rounded-xl p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-white/70">Utilization</span>
          <span className="font-mono text-white">
            {usedU}/{rack.sizeU}U · {utilizationPct}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={utilizationPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${usedU} of ${rack.sizeU}U used (${utilizationPct}%)`}
          aria-label="Rack utilization"
          className="h-2 overflow-hidden rounded-full bg-white/[0.06]"
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${utilizationPct}%`,
              background: `linear-gradient(90deg, ${tagColor}, ${tagColor}aa)`,
            }}
          />
        </div>
      </div>

      <RackBuilder
        rackId={rack.id}
        rackSizeU={rack.sizeU}
        devices={visualizerDevices}
        catalog={catalog}
        unracked={unracked}
      />
    </div>
  );
}
