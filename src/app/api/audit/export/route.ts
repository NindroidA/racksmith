import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { canExportAuditLog } from "@/lib/tiers";
import { csvSafeCell } from "@/lib/csv";

export const dynamic = "force-dynamic";

const MAX_ROWS = 10_000;

export async function GET(request: Request) {
  const guard = await requireApiMember("member");
  if (guard instanceof NextResponse) return guard;
  const { organizationId } = guard;

  // Gate by tier — Free has audit *viewing* but not bulk export.
  const allowed = await canExportAuditLog(organizationId);
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "Audit log export requires the Pro or Business tier. Upgrade to enable bulk export.",
      },
      { status: 402 },
    );
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action") || undefined;
  const entity = url.searchParams.get("entity") || undefined;

  const logs = await withTenant(organizationId, async (tx) =>
    tx.auditLog.findMany({
      where: {
        organizationId,
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

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
