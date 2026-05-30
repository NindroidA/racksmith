import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { calculateCidr } from "@/lib/ip";
import { SubnetDetailClient } from "@/components/network-tools/subnet-detail-client";

type Params = { id: string };

export default async function SubnetDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const { organizationId } = await requireMember("member");

  const [subnet, devices] = await withTenant(organizationId, (tx) =>
    Promise.all([
      tx.subnet.findFirst({
        where: { id, organizationId },
        include: {
          dhcpRanges: { orderBy: { startIp: "asc" } },
          assignments: {
            orderBy: { ipAddress: "asc" },
            include: {
              device: { select: { id: true, name: true, deviceType: true } },
            },
          },
        },
      }),
      tx.device.findMany({
        where: { organizationId },
        select: { id: true, name: true, deviceType: true },
        orderBy: { name: "asc" },
      }),
    ]),
  );

  if (!subnet) notFound();

  let details;
  try {
    details = calculateCidr(subnet.cidr);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/ipam"
        className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" weight="bold" aria-hidden />
        Back to IPAM
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{subnet.name}</h1>
          <p className="mt-1 mono text-white/60">{subnet.cidr}</p>
          {subnet.description && (
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              {subnet.description}
            </p>
          )}
        </div>
        <Link
          href={`/ipam/${subnet.id}/edit`}
          className="glass-button flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
        >
          <PencilSimple className="h-4 w-4" weight="bold" aria-hidden />
          Edit
        </Link>
      </div>

      <SubnetDetailClient
        subnet={{
          id: subnet.id,
          cidr: subnet.cidr,
          name: subnet.name,
          gateway: subnet.gateway,
          dnsServers: subnet.dnsServers,
        }}
        details={{
          kind: details.kind,
          prefix: details.prefix,
          network: details.network,
          broadcast: details.broadcast,
          firstUsable: details.firstUsable,
          lastUsable: details.lastUsable,
          totalHosts: details.totalHosts.toString(),
          usableHosts: details.usableHosts.toString(),
        }}
        assignments={subnet.assignments.map((a) => ({
          id: a.id,
          ipAddress: a.ipAddress,
          status: a.status,
          notes: a.notes,
          device: a.device,
        }))}
        dhcpRanges={subnet.dhcpRanges.map((r) => ({
          id: r.id,
          startIp: r.startIp,
          endIp: r.endIp,
          label: r.label,
        }))}
        devices={devices}
      />
    </div>
  );
}
