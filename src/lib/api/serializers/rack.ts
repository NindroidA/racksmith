import type { ColorTag } from "@/types";

/**
 * Public API row shape for `Rack`. Field-by-field mapping notes:
 *   - `colorTag` (Prisma) → `color` (API) — rename for caller-facing clarity.
 *   - `location: ""` (Prisma default) → `null` (API) — nullability boundary.
 *   - `createdAt: Date` → ISO string — wire format.
 *
 * The cast of `colorTag` to `ColorTag` is safe: writes route through
 * `createRackBodySchema` (validates against `COLOR_TAGS`), and the route
 * factory re-runs `responseSchema.parse` before responding so any drift
 * fails the response, not the wire format.
 */
export function serializeRack(row: {
  id: string;
  name: string;
  sizeU: number;
  location: string;
  colorTag: string;
  createdAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    sizeU: row.sizeU,
    location: row.location === "" ? null : row.location,
    color: row.colorTag as ColorTag,
    createdAt: row.createdAt.toISOString(),
  };
}
