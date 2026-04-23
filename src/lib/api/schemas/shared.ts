import { z } from "zod";
import { registry } from "../openapi-registry";

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const paginationResponseSchema = z
  .object({
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  })
  .openapi("Pagination");

export const errorEnvelopeSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      fields: z.array(
        z.object({ path: z.string(), message: z.string() }),
      ),
      requestId: z.string(),
    }),
  })
  .openapi("ErrorEnvelope");

registry.register("Pagination", paginationResponseSchema);
registry.register("ErrorEnvelope", errorEnvelopeSchema);
