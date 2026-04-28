/**
 * Public API row shape for `DhcpRange`. No field renames, no date columns —
 * the model is timestamp-free, so the serializer is a straight whitelist
 * pass-through. Kept as a function (not an inline object spread) so future
 * shape changes have one place to land.
 */
export function serializeDhcpRange(row: {
  id: string;
  subnetId: string;
  startIp: string;
  endIp: string;
  label: string;
}) {
  return {
    id: row.id,
    subnetId: row.subnetId,
    startIp: row.startIp,
    endIp: row.endIp,
    label: row.label,
  };
}
