import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { COLOR_TAG_MAP, type ColorTag } from "@/types";
import { VlanAssignmentManager } from "@/components/network-tools/vlan-assignment-manager";
import { SubnetLinkSelect } from "@/components/network-tools/subnet-link-select";

type Params = { id: string };

export default async function VlanDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const { organizationId } = await requireMember("member");

  const [vlan, eligibleDevices, allSubnets] = await withTenant(
    organizationId,
    (tx) =>
      Promise.all([
        tx.vlan.findFirst({
          where: { id, organizationId },
          include: {
            subnets: { select: { id: true, cidr: true, name: true } },
            assignments: {
              include: {
                device: {
                  select: {
                    id: true,
                    name: true,
                    deviceType: true,
                    portCount: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        }),
        tx.device.findMany({
          where: {
            organizationId,
            deviceType: { in: ["switch", "router", "firewall", "server"] },
          },
          select: { id: true, name: true, deviceType: true, portCount: true },
          orderBy: { name: "asc" },
        }),
        tx.subnet.findMany({
          where: { organizationId },
          select: { id: true, cidr: true, name: true, vlanId: true },
          orderBy: { cidr: "asc" },
        }),
      ]),
  );

  if (!vlan) notFound();

  const color =
    COLOR_TAG_MAP[vlan.colorTag as ColorTag] ?? COLOR_TAG_MAP.purple;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/network-tools/vlans"
        className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to VLANs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="rounded-md px-2 py-0.5 font-mono text-sm"
              style={{ backgroundColor: `${color}22`, color }}
            >
              VLAN {vlan.vlanId}
            </span>
            <h1 className="text-3xl font-bold text-white">{vlan.name}</h1>
          </div>
          <p className="mt-1 text-sm text-white/60 capitalize">
            {vlan.purpose} · {vlan.assignments.length} device assignment
            {vlan.assignments.length !== 1 ? "s" : ""}
          </p>
          {vlan.description && (
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              {vlan.description}
            </p>
          )}
        </div>
        <Link
          href={`/network-tools/vlans/${vlan.id}/edit`}
          className="glass-button flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Edit
        </Link>
      </div>

      <SubnetLinkSelect
        vlanRowId={vlan.id}
        allSubnets={allSubnets}
        linkedSubnetIds={vlan.subnets.map((s) => s.id)}
      />

      <VlanAssignmentManager
        vlanRowId={vlan.id}
        devices={eligibleDevices}
        assignments={vlan.assignments.map((a) => ({
          id: a.id,
          mode: a.mode,
          portNumber: a.portNumber,
          tagged: a.tagged,
          device: a.device,
        }))}
      />
    </div>
  );
}
