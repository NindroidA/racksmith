import type { DeviceType } from "@/types";

/**
 * Public API row shape for `Device`. Whitelist-only — excludes `userId`,
 * `organizationId`, `updatedAt`, `notes`, `isManual`, `discoveredAt`,
 * `lastSeen`, `osFingerprint`, `canvasX`, `canvasY` (matches
 * `src/lib/api/schemas/device.ts`).
 *
 * The cast of `deviceType` to `DeviceType` is safe: writes route through
 * `createDeviceBodySchema` (validates against `DEVICE_TYPES`), and the
 * route factory re-runs `responseSchema.parse` before responding so any
 * drift fails the response, not the wire format.
 */
export function serializeDevice(row: {
  id: string;
  name: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  sizeU: number;
  portCount: number;
  powerWatts: number | null;
  rackId: string | null;
  positionU: number | null;
  ipAddress: string | null;
  macAddress: string | null;
  hostname: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    deviceType: row.deviceType as DeviceType,
    manufacturer: row.manufacturer,
    model: row.model,
    sizeU: row.sizeU,
    portCount: row.portCount,
    powerWatts: row.powerWatts,
    rackId: row.rackId,
    positionU: row.positionU,
    ipAddress: row.ipAddress,
    macAddress: row.macAddress,
    hostname: row.hostname,
    createdAt: row.createdAt.toISOString(),
  };
}
