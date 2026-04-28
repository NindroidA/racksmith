import { z } from "zod";
import { COLOR_TAGS } from "@/types";
import { VLAN_PURPOSES } from "@/lib/validators";
import { registry } from "../openapi-registry";
import { paginationResponseSchema } from "./shared";

// Response — whitelist-only. Excludes userId, organizationId, updatedAt.
// Maps Prisma's `colorTag` → `color` and `description: ""` stays as empty
// string (keeps wire format predictable for filtering / sorting).
export const vlanResponseSchema = z
  .object({
    id: z.string(),
    vlanId: z.number().int().min(1).max(4094),
    name: z.string(),
    description: z.string(),
    color: z.enum(COLOR_TAGS),
    purpose: z.enum(VLAN_PURPOSES),
    createdAt: z.coerce.date().transform((d) => d.toISOString()),
  })
  .openapi("Vlan");

// Names flow verbatim into CLI config generators (Cisco IOS, UniFi JSON,
// HPE Aruba). Reject newlines + NULs so user-supplied names can't break
// config structure or inject CLI directives when the output is pasted.
// Mirrors the dashboard's `noControlChars` regex in validators.ts.
const vlanNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[^\n\r\0]+$/, "Name contains disallowed control characters");

export const createVlanBodySchema = z
  .object({
    vlanId: z.number().int().min(1).max(4094),
    name: vlanNameSchema,
    description: z.string().trim().max(500).default(""),
    color: z.enum(COLOR_TAGS).default("purple"),
    purpose: z.enum(VLAN_PURPOSES).default("user"),
  })
  .strict()
  .openapi("CreateVlanBody");

export const updateVlanBodySchema = createVlanBodySchema
  .partial()
  .strict()
  .openapi("UpdateVlanBody");

export const listVlansQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    purpose: z.enum(VLAN_PURPOSES).optional(),
  })
  .strict();

export const singleVlanResponseSchema = z
  .object({ vlan: vlanResponseSchema })
  .openapi("VlanResponse");

export const listVlansResponseSchema = z
  .object({
    vlans: z.array(vlanResponseSchema),
    pagination: paginationResponseSchema,
  })
  .openapi("VlanListResponse");

registry.register("Vlan", vlanResponseSchema);
registry.register("CreateVlanBody", createVlanBodySchema);
registry.register("UpdateVlanBody", updateVlanBodySchema);
registry.register("VlanResponse", singleVlanResponseSchema);
registry.register("VlanListResponse", listVlansResponseSchema);
