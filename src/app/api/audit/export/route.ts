import { createApiRoute } from "@/lib/api/route-factory";
import { apiError } from "@/lib/api/response";
import { withTenant } from "@/lib/prisma-tenant";
import { canExportAuditLog } from "@/lib/tiers";
import { csvSafeCell } from "@/lib/csv";

export const dynamic = "force-dynamic";

const MAX_ROWS = 10_000;

export const GET = createApiRoute({
  method: "GET",
  auth: "session-member",
  responseShape: "passthrough",
  summary: "Export audit log as CSV",
  description:
    "Streams the organization's audit log as a CSV file. Capped at 10,000 rows. Optional `action` and `entity` query params filter by audit type. Requires Pro+ tier.",
  handler: async ({ ctx, searchParams }) => {
    const allowed = await canExportAuditLog(ctx.organizationId);
    if (!allowed.ok) {
      return apiError("tier_limit_reached", allowed.reason, 403);
    }

    const action = searchParams.get("action") || undefined;
    const entity = searchParams.get("entity") || undefined;

    const logs = await withTenant(ctx.organizationId, (tx) =>
      tx.auditLog.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(action ? { action } : {}),
          ...(entity ? { entityType: entity } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
      }),
    );

    const header = [
      "timestamp",
      "action",
      "entity",
      "entityId",
      "changes",
      "ipAddress",
      "userAgent",
    ];
    const lines = [header.join(",")];

    for (const log of logs) {
      const meta = (log.metadata ?? {}) as Record<string, unknown>;
      lines.push(
        [
          log.createdAt.toISOString(),
          log.action,
          log.entityType,
          log.entityId ?? "",
          log.changes ?? "",
          meta.ipAddress ?? "",
          meta.userAgent ?? "",
        ]
          .map(csvSafeCell)
          .join(","),
      );
    }

    const csv = lines.join("\n") + "\n";
    const filename = `racksmith-audit-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  },
});
