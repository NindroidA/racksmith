import { z } from "zod";
import { COLOR_TAGS } from "@/types";
import { registry } from "../openapi-registry";
import { paginationResponseSchema } from "./shared";

// Response — whitelist-only. Excludes userId, organizationId, updatedAt,
// and any internal metadata. Dates serialize as ISO-8601 strings. The
// serializer maps Prisma's `colorTag` → `color` and `dnsServers: ""` →
// `null` before this schema parses the row.
export const subnetResponseSchema = z
  .object({
    id: z.string(),
    cidr: z.string(),
    name: z.string(),
    description: z.string(),
    gateway: z.string().nullable(),
    dnsServers: z.string().nullable(),
    color: z.enum(COLOR_TAGS),
    vlanId: z.string().nullable(),
    createdAt: z.coerce.date().transform((d) => d.toISOString()),
  })
  .openapi("Subnet");

// CIDR validation kept loose (string + must contain "/") so both IPv4 and
// IPv6 prefixes pass — the dashboard validator accepts the same shape.
// Stricter CIDR math would reject experimental v6 layouts users actually
// document; we trust the wire format here and validate on materialize/use.
export const createSubnetBodySchema = z
  .object({
    cidr: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/\//, "CIDR must include a prefix length (e.g. /24)"),
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).default(""),
    gateway: z.string().trim().max(45).nullable().default(null),
    dnsServers: z.string().trim().max(400).nullable().default(null),
    color: z.enum(COLOR_TAGS).default("blue"),
    vlanId: z.string().cuid().nullable().default(null),
  })
  .strict()
  .openapi("CreateSubnetBody");

export const updateSubnetBodySchema = createSubnetBodySchema
  .partial()
  .strict()
  .openapi("UpdateSubnetBody");

export const listSubnetsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    vlanId: z.string().cuid().optional(),
  })
  .strict();

export const singleSubnetResponseSchema = z
  .object({ subnet: subnetResponseSchema })
  .openapi("SubnetResponse");

export const listSubnetsResponseSchema = z
  .object({
    subnets: z.array(subnetResponseSchema),
    pagination: paginationResponseSchema,
  })
  .openapi("SubnetListResponse");

registry.register("Subnet", subnetResponseSchema);
registry.register("CreateSubnetBody", createSubnetBodySchema);
registry.register("UpdateSubnetBody", updateSubnetBodySchema);
registry.register("SubnetResponse", singleSubnetResponseSchema);
registry.register("SubnetListResponse", listSubnetsResponseSchema);
