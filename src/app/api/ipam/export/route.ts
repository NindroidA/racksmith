import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { canExportFormat } from "@/lib/tiers";
import { csvSafeCell } from "@/lib/csv";

export const dynamic = "force-dynamic";

const MAX_ROWS = 10_000;

export async function GET(request: Request) {
  const guard = await requireApiMember("member");
  if (guard instanceof NextResponse) return guard;
  const { organizationId } = guard;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "json" ? "json" : "csv";
  const subnetId = searchParams.get("subnet");

  // Tier gate: Free can export PNG only; CSV/JSON gated to Pro+.
  const allowed = await canExportFormat(organizationId, format);
  if (!allowed) {
    return NextResponse.json(
      {
        error: `${format.toUpperCase()} export requires the Pro or Business tier.`,
      },
      { status: 402 },
    );
  }

  const { total, assignments } = await withTenant(
    organizationId,
    async (tx) => {
      const total = await tx.ipAssignment.count({
        where: {
          organizationId,
          ...(subnetId ? { subnetId } : {}),
        },
      });
      if (total > MAX_ROWS) {
        return { total, assignments: null };
      }
      const assignments = await tx.ipAssignment.findMany({
        where: {
          organizationId,
          ...(subnetId ? { subnetId } : {}),
        },
        orderBy: [{ subnet: { cidr: "asc" } }, { ipAddress: "asc" }],
        include: {
          subnet: { select: { cidr: true, name: true } },
          device: {
            select: { name: true, deviceType: true, macAddress: true },
          },
        },
      });
      return { total, assignments };
    },
  );
  if (assignments === null) {
    return NextResponse.json(
      {
        error: `Export capped at ${MAX_ROWS} rows. You have ${total}. Filter by subnet or contact support for bulk export.`,
      },
      { status: 413 },
    );
  }

  if (format === "json") {
    const payload = assignments.map((a) => ({
      subnet: a.subnet.cidr,
      subnetName: a.subnet.name,
      ipAddress: a.ipAddress,
      status: a.status,
      deviceName: a.device?.name ?? null,
      deviceType: a.device?.deviceType ?? null,
      macAddress: a.device?.macAddress ?? null,
      notes: a.notes,
    }));
    return NextResponse.json(payload, {
      headers: {
        "Content-Disposition": `attachment; filename="ipam-${Date.now()}.json"`,
      },
    });
  }

  const header = [
    "subnet_cidr",
    "subnet_name",
    "ip_address",
    "status",
    "device_name",
    "device_type",
    "mac_address",
    "notes",
  ].join(",");

  const rows = assignments.map((a) =>
    [
      a.subnet.cidr,
      a.subnet.name,
      a.ipAddress,
      a.status,
      a.device?.name ?? "",
      a.device?.deviceType ?? "",
      a.device?.macAddress ?? "",
      a.notes,
    ]
      .map(csvSafeCell)
      .join(","),
  );

  const body = [header, ...rows].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ipam-${Date.now()}.csv"`,
    },
  });
}
