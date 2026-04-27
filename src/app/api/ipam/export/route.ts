import { createApiRoute } from "@/lib/api/route-factory";
import { apiError } from "@/lib/api/response";
import { withTenant } from "@/lib/prisma-tenant";
import { canExportFormat } from "@/lib/tiers";
import { csvSafeCell } from "@/lib/csv";

export const dynamic = "force-dynamic";

const MAX_ROWS = 10_000;

export const GET = createApiRoute({
  method: "GET",
  auth: "session-member",
  responseShape: "passthrough",
  summary: "Export IPAM assignments as CSV or JSON",
  description:
    "Streams the organization's IP assignments. Supports `format=csv` (default) or `format=json`. Optional `subnet` query param filters by subnet id. Capped at 10,000 rows. Requires Pro+ tier.",
  handler: async ({ ctx, searchParams }) => {
    const format = searchParams.get("format") === "json" ? "json" : "csv";
    const subnetId = searchParams.get("subnet");

    const allowed = await canExportFormat(ctx.organizationId, format);
    if (!allowed.ok) {
      return apiError("tier_limit_reached", allowed.reason, 403);
    }

    const { total, assignments } = await withTenant(
      ctx.organizationId,
      async (tx) => {
        const total = await tx.ipAssignment.count({
          where: {
            organizationId: ctx.organizationId,
            ...(subnetId ? { subnetId } : {}),
          },
        });
        if (total > MAX_ROWS) {
          return { total, assignments: null };
        }
        const assignments = await tx.ipAssignment.findMany({
          where: {
            organizationId: ctx.organizationId,
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
      return apiError(
        "validation_failed",
        `Export capped at ${MAX_ROWS} rows. You have ${total}. Filter by subnet or contact support for bulk export.`,
        400,
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
      return new Response(JSON.stringify(payload), {
        headers: {
          "Content-Type": "application/json",
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

    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ipam-${Date.now()}.csv"`,
      },
    });
  },
});
