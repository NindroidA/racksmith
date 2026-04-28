/**
 * Public API row shape for `Connection`. Field names match Prisma 1:1 —
 * no renames. The cast of `cableType` to the literal-union enum is
 * trusted because writes route through `createConnectionBodySchema`
 * (validates against `CABLE_TYPES`); the route factory re-runs
 * `responseSchema.parse` before responding so any drift fails the
 * response, not the wire format.
 */
export function serializeConnection(row: {
  id: string;
  sourceDeviceId: string;
  sourcePort: string;
  targetDeviceId: string;
  targetPort: string;
  cableType: string;
  cableLengthFt: number | null;
  vlan: string | null;
  bandwidth: string | null;
  description: string;
  createdAt: Date;
}) {
  return {
    id: row.id,
    sourceDeviceId: row.sourceDeviceId,
    sourcePort: row.sourcePort,
    targetDeviceId: row.targetDeviceId,
    targetPort: row.targetPort,
    cableType: row.cableType as
      | "ethernet"
      | "fiber"
      | "sfp"
      | "dac"
      | "power"
      | "other",
    cableLengthFt: row.cableLengthFt,
    vlan: row.vlan,
    bandwidth: row.bandwidth,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}
