import type { ColorTag } from "@/types";

/**
 * Public API row shape for `Subnet`. Field-by-field mapping:
 *   - `colorTag` (Prisma) → `color` (API) — rename for caller-facing clarity.
 *   - `dnsServers: ""` (Prisma default) → `null` (API) — nullability boundary;
 *     comma-joined string at the DB layer, the API treats empty as absent.
 *   - `gateway` is already nullable on both sides.
 *   - `createdAt: Date` → ISO string — wire format.
 *
 * The cast of `colorTag` to `ColorTag` is safe: writes route through
 * `createSubnetBodySchema` (validates against `COLOR_TAGS`), and the route
 * factory re-runs `responseSchema.parse` before responding so any drift
 * fails the response, not the wire format.
 */
export function serializeSubnet(row: {
  id: string;
  cidr: string;
  name: string;
  description: string;
  gateway: string | null;
  dnsServers: string;
  colorTag: string;
  vlanId: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    cidr: row.cidr,
    name: row.name,
    description: row.description,
    gateway: row.gateway,
    dnsServers: row.dnsServers === "" ? null : row.dnsServers,
    color: row.colorTag as ColorTag,
    vlanId: row.vlanId,
    createdAt: row.createdAt.toISOString(),
  };
}
