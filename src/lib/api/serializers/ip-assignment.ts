/**
 * Public API row shape for `IpAssignment`. No field renames — Prisma column
 * names map 1:1 to the API DTO. `status` is cast to the literal-union enum
 * (the route factory re-runs `responseSchema.parse` before sending so any
 * drift from the validator's `IP_ASSIGNMENT_STATUSES` set fails at response
 * time, not on the wire). Dates → ISO strings.
 */
export function serializeIpAssignment(row: {
  id: string;
  subnetId: string;
  ipAddress: string;
  deviceId: string | null;
  status: string;
  notes: string;
  createdAt: Date;
}) {
  return {
    id: row.id,
    subnetId: row.subnetId,
    ipAddress: row.ipAddress,
    deviceId: row.deviceId,
    status: row.status as "assigned" | "reserved" | "dhcp",
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}
