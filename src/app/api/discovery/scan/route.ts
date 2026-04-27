import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { runPingScan, validateCidr, cidrHostCount } from "@/lib/discovery/nmap";
import { completeScan } from "@/lib/discovery/scan-completion";

export const dynamic = "force-dynamic";

/**
 * POST /api/discovery/scan
 * Body: { subnet: string }
 * Creates a DiscoveryScan record, kicks off nmap in background, returns scan id.
 * Client polls GET /api/discovery/scan?id=... for progress.
 */
export async function POST(req: Request) {
  const guard = await requireApiMember("member");
  if (guard instanceof NextResponse) return guard;
  const { session, organizationId } = guard;

  const body = await req.json().catch(() => null);
  const subnet = typeof body?.subnet === "string" ? body.subnet : "";
  const validated = validateCidr(subnet);
  if (!validated) {
    return NextResponse.json(
      { error: "Invalid CIDR. Use format like 192.168.1.0/24" },
      { status: 400 },
    );
  }

  // Safety: cap at /16 (65K hosts) to prevent accidental huge scans
  const hostCount = cidrHostCount(validated);
  if (hostCount > 65536) {
    return NextResponse.json(
      {
        error: `Subnet too large (${hostCount} hosts). Max supported is /16 (65,536 hosts).`,
      },
      { status: 400 },
    );
  }

  // Rate limit: one active scan per user at a time
  const existing = await withTenant(organizationId, (tx) =>
    tx.discoveryScan.findFirst({
      where: {
        organizationId,
        status: { in: ["pending", "running"] },
      },
    }),
  );
  if (existing) {
    return NextResponse.json(
      {
        error: "A scan is already in progress. Cancel it first.",
        scanId: existing.id,
      },
      { status: 409 },
    );
  }

  const scan = await withTenant(organizationId, async (tx) => {
    const created = await tx.discoveryScan.create({
      data: {
        userId: session.user.id,
        organizationId,
        subnet: validated,
        status: "running",
        startedAt: new Date(),
      },
      select: { id: true },
    });
    await audit({
      userId: session.user.id,
      organizationId,
      action: "scan_started",
      entityType: "discovery_scan",
      entityId: created.id,
      metadata: { subnet: validated, hostCount },
      tx,
    });
    return created;
  });

  // Fire-and-forget the actual nmap process. Callback hands off to
  // `completeScan` which owns matching, persistence, audit, and the
  // partial-update recovery branch.
  runPingScan(validated, (result) =>
    completeScan({
      scanId: scan.id,
      organizationId,
      userId: session.user.id,
      subnet: validated,
      result,
    }),
  );

  return NextResponse.json({ scanId: scan.id });
}

/**
 * GET /api/discovery/scan?id=...
 * Returns current status of a scan. Client polls until status reaches a
 * terminal value: `completed` | `failed` | `cancelled`.
 */
export async function GET(req: Request) {
  const guard = await requireApiMember("member");
  if (guard instanceof NextResponse) return guard;
  const { organizationId } = guard;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const scan = await withTenant(organizationId, (tx) =>
    tx.discoveryScan.findFirst({
      where: { id, organizationId },
    }),
  );

  if (!scan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: scan.id,
    subnet: scan.subnet,
    status: scan.status,
    hostsFound: scan.hostsFound,
    hostsNew: scan.hostsNew,
    hostsKnown: scan.hostsKnown,
    duration: scan.duration,
    error: scan.error,
    startedAt: scan.startedAt,
    completedAt: scan.completedAt,
    results: scan.results,
  });
}
