import { z } from "zod";
import { registry } from "../openapi-registry";
import { paginationResponseSchema } from "./shared";

// Response — whitelist-only. The Prisma `DhcpRange` model has no
// `createdAt`/`updatedAt` columns (same as the dashboard — ranges are
// short-lived enough that audit log already captures the "when"); the
// API DTO omits them too. Field names match Prisma 1:1.
export const dhcpRangeResponseSchema = z
  .object({
    id: z.string(),
    subnetId: z.string(),
    startIp: z.string(),
    endIp: z.string(),
    label: z.string(),
  })
  .openapi("DhcpRange");

export const createDhcpRangeBodySchema = z
  .object({
    subnetId: z.string().cuid(),
    startIp: z.string().trim().min(1).max(45),
    endIp: z.string().trim().min(1).max(45),
    label: z.string().trim().max(100).default(""),
  })
  .strict()
  .openapi("CreateDhcpRangeBody");

export const updateDhcpRangeBodySchema = createDhcpRangeBodySchema
  .partial()
  .strict()
  .openapi("UpdateDhcpRangeBody");

export const listDhcpRangesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    subnetId: z.string().cuid().optional(),
  })
  .strict();

export const singleDhcpRangeResponseSchema = z
  .object({ dhcpRange: dhcpRangeResponseSchema })
  .openapi("DhcpRangeResponse");

export const listDhcpRangesResponseSchema = z
  .object({
    dhcpRanges: z.array(dhcpRangeResponseSchema),
    pagination: paginationResponseSchema,
  })
  .openapi("DhcpRangeListResponse");

registry.register("DhcpRange", dhcpRangeResponseSchema);
registry.register("CreateDhcpRangeBody", createDhcpRangeBodySchema);
registry.register("UpdateDhcpRangeBody", updateDhcpRangeBodySchema);
registry.register("DhcpRangeResponse", singleDhcpRangeResponseSchema);
registry.register("DhcpRangeListResponse", listDhcpRangesResponseSchema);
