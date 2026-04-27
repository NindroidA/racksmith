import { z } from "zod";
import { createApiRoute } from "@/lib/api/route-factory";
import { apiError } from "@/lib/api/response";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { runPingScan, validateCidr, cidrHostCount } from "@/lib/discovery/nmap";
import { completeScan } from "@/lib/discovery/scan-completion";

export const dynamic = "force-dynamic";

const MAX_HOSTS = 65_536; // /16 cap

const startScanBodySchema = z.object({ subnet: z.string().min(1) }).strict();

const startScanResponseSchema = z.object({ scanId: z.string() });

const scanProgressResponseSchema = z.object({
  id: z.string(),
  subnet: z.string(),
  status: z.string(),
  hostsFound: z.number(),
  hostsNew: z.number(),
  hostsKnown: z.number(),
  duration: z.number().nullable(),
  error: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  results: z.unknown(),
});

/**
 * POST /api/discovery/scan
 * Body: { subnet: string }
 * Creates a DiscoveryScan record, kicks off nmap in background, returns scan id.
 * Client polls GET /api/discovery/scan?id=... for progress.
 */
export const POST = createApiRoute({
  method: "POST",
  auth: "session-member",
  bodySchema: startScanBodySchema,
  responseSchema: startScanResponseSchema,
  summary: "Start a discovery scan",
  handler: async ({ body, ctx }) => {
    const validated = validateCidr(body.subnet);
    if (!validated) {
      return apiError(
        "validation_failed",
        "Invalid CIDR. Use format like 192.168.1.0/24",
        400,
      );
    }

    const hostCount = cidrHostCount(validated);
    if (hostCount > MAX_HOSTS) {
      return apiError(
        "validation_failed",
        `Subnet too large (${hostCount} hosts). Max supported is /16 (${MAX_HOSTS.toLocaleString()} hosts).`,
        400,
      );
    }

    // One active scan per organization at a time. The factory's apiError
    // envelope can't carry the existing scan's id; the dashboard reads the
    // active scan directly from its server query, so the id isn't required
    // in the conflict response.
    const existing = await withTenant(ctx.organizationId, (tx) =>
      tx.discoveryScan.findFirst({
        where: {
          organizationId: ctx.organizationId,
          status: { in: ["pending", "running"] },
        },
        select: { id: true },
      }),
    );
    if (existing) {
      return apiError(
        "conflict",
        "A scan is already in progress. Cancel it first.",
        409,
      );
    }

    const scan = await withTenant(ctx.organizationId, async (tx) => {
      const created = await tx.discoveryScan.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          subnet: validated,
          status: "running",
          startedAt: new Date(),
        },
        select: { id: true },
      });
      await audit({
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        action: "scan_started",
        entityType: "discovery_scan",
        entityId: created.id,
        metadata: { subnet: validated, hostCount },
        tx,
      });
      return created;
    });

    // Fire-and-forget the nmap process. completeScan handles the post-run
    // matching, persistence, audit, and partial-update recovery branch.
    runPingScan(validated, (result) =>
      completeScan({
        scanId: scan.id,
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        subnet: validated,
        result,
      }),
    );

    return { scanId: scan.id };
  },
});

/**
 * GET /api/discovery/scan?id=...
 * Returns current status of a scan. Client polls until status reaches a
 * terminal value: `completed` | `failed` | `cancelled`.
 */
export const GET = createApiRoute({
  method: "GET",
  auth: "session-member",
  responseSchema: scanProgressResponseSchema,
  summary: "Fetch scan progress",
  handler: async ({ ctx, searchParams }) => {
    const id = searchParams.get("id");
    if (!id) {
      return apiError("validation_failed", "Missing id query param", 400);
    }

    const scan = await withTenant(ctx.organizationId, (tx) =>
      tx.discoveryScan.findFirst({
        where: { id, organizationId: ctx.organizationId },
      }),
    );

    if (!scan) {
      return apiError("not_found", "Scan not found", 404);
    }

    return {
      id: scan.id,
      subnet: scan.subnet,
      status: scan.status,
      hostsFound: scan.hostsFound,
      hostsNew: scan.hostsNew,
      hostsKnown: scan.hostsKnown,
      duration: scan.duration,
      error: scan.error,
      startedAt: scan.startedAt?.toISOString() ?? null,
      completedAt: scan.completedAt?.toISOString() ?? null,
      results: scan.results,
    };
  },
});
