import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { runPingScan, validateCidr, cidrHostCount } from "@/lib/discovery/nmap";
import { matchHost, guessDeviceType } from "@/lib/discovery/matcher";

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

  // Fire-and-forget the actual nmap process. Callback writes results to DB
  // when done. We don't await it — return scan id immediately.
  runPingScan(validated, async (result) => {
    try {
      if ("error" in result) {
        await withTenant(organizationId, (tx) =>
          tx.discoveryScan.update({
            where: { id: scan.id },
            data: {
              status: "failed",
              error: result.error,
              completedAt: new Date(),
            },
          }),
        );
        return;
      }

      // Match against user's existing devices
      const devices = await withTenant(organizationId, (tx) =>
        tx.device.findMany({
          where: { organizationId },
          select: {
            id: true,
            name: true,
            ipAddress: true,
            macAddress: true,
            hostname: true,
          },
        }),
      );

      const enriched = result.hosts.map((host) => {
        const match = matchHost(host, devices);
        return {
          ...host,
          match,
          typeGuess: guessDeviceType(host),
          // Per-host action state; set when user approves/ignores/assigns
          actionState: "pending" as const,
        };
      });

      const hostsNew = enriched.filter((h) => h.match.kind === "new").length;
      const hostsKnown = enriched.filter(
        (h) => h.match.kind === "known",
      ).length;

      await withTenant(organizationId, (tx) =>
        tx.discoveryScan.update({
          where: { id: scan.id },
          data: {
            status: "completed",
            hostsFound: enriched.length,
            hostsNew,
            hostsKnown,
            duration: result.durationSec,
            results: { hosts: enriched },
            completedAt: new Date(),
          },
        }),
      );

      await audit({
        userId: session.user.id,
        organizationId,
        action: "scan_completed",
        entityType: "discovery_scan",
        entityId: scan.id,
        metadata: {
          subnet: validated,
          hostsFound: enriched.length,
          hostsNew,
          hostsKnown,
          duration: result.durationSec,
        },
      });

      // Update lastSeen on matched devices
      await withTenant(organizationId, async (tx) => {
        for (const h of enriched) {
          if (h.match.kind === "known") {
            await tx.device.update({
              where: { id: h.match.deviceId },
              data: {
                lastSeen: new Date(),
                // Update network details from discovery if missing
                ...(h.hostname ? { hostname: h.hostname } : {}),
              },
            });
          }
        }
      });
    } catch (err) {
      // Post-processing failed mid-flight — the DB may be partially updated
      // (some Device upserts committed before the throw). Best-effort mark
      // the scan row as failed so the UI stops polling; if *that* update
      // also fails, we still want a trail, so log both errors.
      console.error("Scan post-processing failed:", err);
      try {
        await withTenant(organizationId, (tx) =>
          tx.discoveryScan.update({
            where: { id: scan.id },
            data: {
              status: "failed",
              error:
                err instanceof Error ? err.message : "Post-processing failed",
              completedAt: new Date(),
            },
          }),
        );
      } catch (recoveryErr) {
        console.error(
          "[discovery.scan] recovery update also failed",
          { scanId: scan.id },
          recoveryErr,
        );
      }
    }
  });

  return NextResponse.json({ scanId: scan.id });
}

/**
 * GET /api/discovery/scan?id=...
 * Returns current status of a scan. Client polls until status=completed|failed.
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
