import { z } from "zod";
import { registry } from "../openapi-registry";
import { paginationResponseSchema } from "./shared";

// Mirrors `CABLE_TYPES` from src/lib/validators.ts (`connectionSchema`).
// Kept as a local const so the API surface doesn't import from a server-
// action-adjacent file (validators.ts is a leaf, but the boundary is
// clearer if API schemas declare their own enum and we cross-check at
// review time when adding values).
const CABLE_TYPES = [
  "ethernet",
  "fiber",
  "sfp",
  "dac",
  "power",
  "other",
] as const;

// Response — whitelist-only. Field names match Prisma 1:1 (no renames).
// `cableLengthFt`/`vlan`/`bandwidth` are nullable on both sides; the
// dashboard convention writes `null` rather than the empty string when
// absent. Dates → ISO strings.
export const connectionResponseSchema = z
  .object({
    id: z.string(),
    sourceDeviceId: z.string(),
    sourcePort: z.string(),
    targetDeviceId: z.string(),
    targetPort: z.string(),
    cableType: z.enum(CABLE_TYPES),
    cableLengthFt: z.number().nullable(),
    vlan: z.string().nullable(),
    bandwidth: z.string().nullable(),
    description: z.string(),
    createdAt: z.coerce.date().transform((d) => d.toISOString()),
  })
  .openapi("Connection");

// Self-loop guard at the schema layer — a device connecting to itself is
// nonsensical topology data and the dashboard's `topology/actions.ts`
// already rejects it. Zod's `.refine` produces a `validation_failed`
// envelope at the route boundary so the API is symmetrical with the
// dashboard's error.
export const createConnectionBodySchema = z
  .object({
    sourceDeviceId: z.string().cuid(),
    sourcePort: z.string().trim().max(50).default(""),
    targetDeviceId: z.string().cuid(),
    targetPort: z.string().trim().max(50).default(""),
    cableType: z.enum(CABLE_TYPES).default("ethernet"),
    cableLengthFt: z.number().min(0).max(1000).nullable().default(null),
    vlan: z.string().trim().max(50).nullable().default(null),
    bandwidth: z.string().trim().max(20).nullable().default(null),
    description: z.string().trim().max(500).default(""),
  })
  .strict()
  .refine((d) => d.sourceDeviceId !== d.targetDeviceId, {
    message: "A device cannot connect to itself",
    path: ["targetDeviceId"],
  })
  .openapi("CreateConnectionBody");

// PATCH allows partial updates. The self-loop guard re-runs only when
// both endpoints are present in the body (a single-side change can't
// turn it into a self-loop on its own — the route handler revalidates
// post-merge).
export const updateConnectionBodySchema = z
  .object({
    sourceDeviceId: z.string().cuid().optional(),
    sourcePort: z.string().trim().max(50).optional(),
    targetDeviceId: z.string().cuid().optional(),
    targetPort: z.string().trim().max(50).optional(),
    cableType: z.enum(CABLE_TYPES).optional(),
    cableLengthFt: z.number().min(0).max(1000).nullable().optional(),
    vlan: z.string().trim().max(50).nullable().optional(),
    bandwidth: z.string().trim().max(20).nullable().optional(),
    description: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine(
    (d) =>
      d.sourceDeviceId === undefined ||
      d.targetDeviceId === undefined ||
      d.sourceDeviceId !== d.targetDeviceId,
    {
      message: "A device cannot connect to itself",
      path: ["targetDeviceId"],
    },
  )
  .openapi("UpdateConnectionBody");

export const listConnectionsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    sourceDeviceId: z.string().cuid().optional(),
    targetDeviceId: z.string().cuid().optional(),
    cableType: z.enum(CABLE_TYPES).optional(),
  })
  .strict();

export const singleConnectionResponseSchema = z
  .object({ connection: connectionResponseSchema })
  .openapi("ConnectionResponse");

export const listConnectionsResponseSchema = z
  .object({
    connections: z.array(connectionResponseSchema),
    pagination: paginationResponseSchema,
  })
  .openapi("ConnectionListResponse");

registry.register("Connection", connectionResponseSchema);
registry.register("CreateConnectionBody", createConnectionBodySchema);
registry.register("UpdateConnectionBody", updateConnectionBodySchema);
registry.register("ConnectionResponse", singleConnectionResponseSchema);
registry.register("ConnectionListResponse", listConnectionsResponseSchema);

export { CABLE_TYPES };
