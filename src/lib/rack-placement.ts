import "server-only";

import { withTenant } from "./prisma-tenant";

export type PlacementCheck = { ok: true } | { ok: false; error: string };

export type RackPlacementInput = {
  organizationId: string;
  rackId: string;
  sizeU: number;
  positionU: number;
  /** When moving an existing device, pass its id so its own slots don't
   *  count as a collision. Omit for fresh placements. */
  excludeDeviceId?: string;
};

/**
 * Verify that installing a device of `sizeU` at `positionU` in `rackId` is
 * legal — both fits inside the rack's height and doesn't collide with any
 * already-installed device's slot range.
 *
 * Tenant-scoped: the rack and any installed devices must belong to
 * `organizationId`. Wrapped in `withTenant` so RLS enforces the boundary
 * even if the caller forgot to.
 */
export async function validateRackPlacement(
  input: RackPlacementInput,
): Promise<PlacementCheck> {
  const { organizationId, rackId, sizeU, positionU, excludeDeviceId } = input;
  const { rack, installed } = await withTenant(organizationId, async (tx) => {
    const rack = await tx.rack.findFirst({
      where: { id: rackId, organizationId },
      select: { sizeU: true },
    });
    if (!rack) {
      return {
        rack: null,
        installed: [] as { positionU: number | null; sizeU: number }[],
      };
    }
    const installed = await tx.device.findMany({
      where: {
        rackId,
        organizationId,
        ...(excludeDeviceId ? { id: { not: excludeDeviceId } } : {}),
      },
      select: { positionU: true, sizeU: true },
    });
    return { rack, installed };
  });

  if (!rack) return { ok: false, error: "Rack not found" };

  // Height check: U positions are 1-indexed and a sizeU=2 device at
  // positionU=10 occupies slots 10 and 11. The top slot is therefore
  // positionU + sizeU - 1, which must be ≤ rack.sizeU.
  if (positionU < 1) {
    return { ok: false, error: "Position must be 1U or higher" };
  }
  if (positionU + sizeU - 1 > rack.sizeU) {
    return {
      ok: false,
      error: `Device of ${sizeU}U at position ${positionU}U would extend past the top of a ${rack.sizeU}U rack`,
    };
  }

  const occupied = new Set<number>();
  for (const d of installed) {
    if (d.positionU == null) continue;
    for (let u = d.positionU; u < d.positionU + d.sizeU; u++) occupied.add(u);
  }

  for (let u = positionU; u < positionU + sizeU; u++) {
    if (occupied.has(u)) {
      return { ok: false, error: `Slot ${u}U is already occupied` };
    }
  }

  return { ok: true };
}
