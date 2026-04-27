import "server-only";

import { audit } from "@/lib/audit";
import { withTenant } from "@/lib/prisma-tenant";
import { guessDeviceType, matchHost } from "./matcher";
import type { NmapScanResult } from "./nmap";

type CompleteScanArgs = {
  scanId: string;
  organizationId: string;
  userId: string;
  subnet: string;
  result: NmapScanResult | { error: string };
};

/**
 * Apply the post-nmap callback work to a `DiscoveryScan` row: matches the
 * raw host list against existing devices, summarizes counts, persists the
 * row + audit entry, and refreshes `lastSeen` on matched devices.
 *
 * Extracted from `POST /api/discovery/scan`'s inline callback so the route
 * stays focused on validation + dispatch. The call site fires this without
 * awaiting (fire-and-forget after `runPingScan`); we still try/catch around
 * the whole body so a partial-update mid-flight gets the scan row marked
 * `failed` and stops the client poll loop.
 */
export async function completeScan(args: CompleteScanArgs): Promise<void> {
  const { scanId, organizationId, userId, subnet, result } = args;

  try {
    if ("error" in result) {
      await withTenant(organizationId, (tx) =>
        tx.discoveryScan.update({
          where: { id: scanId },
          data: {
            status: "failed",
            error: result.error,
            completedAt: new Date(),
          },
        }),
      );
      return;
    }

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

    const enriched = result.hosts.map((host) => ({
      ...host,
      match: matchHost(host, devices),
      typeGuess: guessDeviceType(host),
      // Per-host action state; set when user approves/ignores/assigns
      actionState: "pending" as const,
    }));

    const hostsNew = enriched.filter((h) => h.match.kind === "new").length;
    const hostsKnown = enriched.filter((h) => h.match.kind === "known").length;

    await withTenant(organizationId, (tx) =>
      tx.discoveryScan.update({
        where: { id: scanId },
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
      userId,
      organizationId,
      action: "scan_completed",
      entityType: "discovery_scan",
      entityId: scanId,
      metadata: {
        subnet,
        hostsFound: enriched.length,
        hostsNew,
        hostsKnown,
        duration: result.durationSec,
      },
    });

    // Refresh lastSeen on matched devices so the inventory page reflects
    // the most recent successful scan. Backfill hostname when missing.
    await withTenant(organizationId, async (tx) => {
      for (const h of enriched) {
        if (h.match.kind === "known") {
          await tx.device.update({
            where: { id: h.match.deviceId },
            data: {
              lastSeen: new Date(),
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
          where: { id: scanId },
          data: {
            status: "failed",
            error: err instanceof Error ? err.message : "Post-processing failed",
            completedAt: new Date(),
          },
        }),
      );
    } catch (recoveryErr) {
      console.error(
        "[discovery.scan] recovery update also failed",
        { scanId },
        recoveryErr,
      );
    }
  }
}
