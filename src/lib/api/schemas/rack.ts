import { z } from "zod";
import { COLOR_TAGS } from "@/types";
import { registry } from "../openapi-registry";
import { paginationResponseSchema } from "./shared";

// Response — whitelist-only. Excludes userId, organizationId, updatedAt,
// description, and any internal metadata. Dates serialize as ISO-8601 strings.
// At the route layer, the serializer maps Prisma's `colorTag` → `color` and
// `location: ""` → `location: null` before this schema parses the row.
export const rackResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    sizeU: z.number().int(),
    location: z.string().nullable(),
    color: z.enum(COLOR_TAGS),
    createdAt: z.coerce.date().transform((d) => d.toISOString()),
  })
  .openapi("Rack");

export const createRackBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    sizeU: z.number().int().min(1).max(60),
    location: z.string().trim().max(200).nullable().default(null),
    color: z.enum(COLOR_TAGS).default("blue"),
  })
  .strict()
  .openapi("CreateRackBody");

export const updateRackBodySchema = createRackBodySchema
  .partial()
  .strict()
  .openapi("UpdateRackBody");

export const listRacksQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    location: z.string().optional(),
  })
  .strict();

export const singleRackResponseSchema = z
  .object({ rack: rackResponseSchema })
  .openapi("RackResponse");

export const listRacksResponseSchema = z
  .object({
    racks: z.array(rackResponseSchema),
    pagination: paginationResponseSchema,
  })
  .openapi("RackListResponse");

registry.register("Rack", rackResponseSchema);
registry.register("CreateRackBody", createRackBodySchema);
registry.register("UpdateRackBody", updateRackBodySchema);
registry.register("RackResponse", singleRackResponseSchema);
registry.register("RackListResponse", listRacksResponseSchema);
