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
      // Conditional update — if the scan was cancelled in flight, the row
      // is already in a terminal state (`status: "cancelled"`) and we must
      // not overwrite it. Same pattern below for the success branch.
      await withTenant(organizationId, (tx) =>
        tx.discoveryScan.updateMany({
          where: {
            id: scanId,
            organizationId,
            status: { in: ["pending", "running"] },
          },
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

    const writeResult = await withTenant(organizationId, (tx) =>
      tx.discoveryScan.updateMany({
        where: {
          id: scanId,
          organizationId,
          status: { in: ["pending", "running"] },
        },
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
    // count===0 means the user cancelled (or otherwise terminated) the scan
    // between dispatch and this callback. Skip the audit + device updates
    // so we don't grow the scan_completed log with a row that semantically
    // never completed.
    if (writeResult.count === 0) return;

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
    // the most recent successful scan. Two writes:
    //   1. Bulk `updateMany` for lastSeen across every matched id (one query).
    //   2. Per-device hostname backfill (Promise.all) only when hostname is
    //      missing. Skipped if no hosts had hostname data.
    const lastSeenAt = new Date();
    const knownDeviceIds = Array.from(
      new Set(
        enriched.flatMap((h) =>
          h.match.kind === "known" ? [h.match.deviceId] : [],
        ),
      ),
    );
    const hostnameUpdates = new Map<string, string>();
    for (const h of enriched) {
      if (h.match.kind === "known" && h.hostname) {
        hostnameUpdates.set(h.match.deviceId, h.hostname);
      }
    }

    if (knownDeviceIds.length > 0) {
      await withTenant(organizationId, async (tx) => {
        await tx.device.updateMany({
          where: { id: { in: knownDeviceIds }, organizationId },
          data: { lastSeen: lastSeenAt },
        });
        if (hostnameUpdates.size > 0) {
          await Promise.all(
            Array.from(hostnameUpdates.entries()).map(([deviceId, hostname]) =>
              tx.device.update({
                where: { id: deviceId },
                data: { hostname },
              }),
            ),
          );
        }
      });
    }
  } catch (err) {
    // Post-processing failed mid-flight — the DB may be partially updated
    // (some Device upserts committed before the throw). Best-effort mark
    // the scan row as failed so the UI stops polling; if *that* update
    // also fails, we still want a trail, so log both errors.
    console.error("Scan post-processing failed:", err);
    try {
      // Same conditional update as above — never overwrite a terminal
      // status (cancelled/failed/completed) with our recovery write.
      await withTenant(organizationId, (tx) =>
        tx.discoveryScan.updateMany({
          where: {
            id: scanId,
            organizationId,
            status: { in: ["pending", "running"] },
          },
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
        { scanId },
        recoveryErr,
      );
    }
  }
}
