import type { ColorTag } from "@/types";
import type { VlanPurpose } from "@/lib/validators";

/**
 * Public API row shape for `Vlan`. Field-by-field mapping:
 *   - `colorTag` (Prisma) → `color` (API) — rename for caller-facing clarity.
 *   - `vlanId: Int` (Prisma) → `vlanId: number` (API) — same name, the Prisma
 *     row also has a string CUID `id`, both surfaced separately.
 *   - `purpose` is a free-form string at the DB layer; we cast to
 *     `VlanPurpose` knowing the route's responseSchema.parse will catch
 *     any drift before the response leaves the handler.
 *   - `createdAt: Date` → ISO string — wire format.
 */
export function serializeVlan(row: {
  id: string;
  vlanId: number;
  name: string;
  description: string;
  colorTag: string;
  purpose: string;
  createdAt: Date;
}) {
  return {
    id: row.id,
    vlanId: row.vlanId,
    name: row.name,
    description: row.description,
    color: row.colorTag as ColorTag,
    purpose: row.purpose as VlanPurpose,
    createdAt: row.createdAt.toISOString(),
  };
}
