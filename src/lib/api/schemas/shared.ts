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
      fields: z.array(z.object({ path: z.string(), message: z.string() })),
      requestId: z.string(),
    }),
  })
  .openapi("ErrorEnvelope");

registry.register("Pagination", paginationResponseSchema);
registry.register("ErrorEnvelope", errorEnvelopeSchema);

/**
 * Standard 4xx/5xx response set every authenticated route can emit. The
 * factory in `route-factory.ts` short-circuits on 401 (auth), 403 (role/tier),
 * 415 (content-type), 400 (body validation), 429 (rate limit), and 500
 * (handler throw). Path params yield 404 — see `notFoundResponse`. Routes
 * that have additional codes (e.g. 409 conflict) should spread
 * `commonErrorResponses` then add their own.
 */
export const commonErrorResponses = {
  400: errorResponse("Invalid request body or query params"),
  401: errorResponse("Missing or invalid API key"),
  403: errorResponse(
    "API key lacks the required role, tier, or organization access",
  ),
  415: errorResponse("Content-Type must be application/json (writes only)"),
  429: errorResponse("Rate limit exceeded"),
  500: errorResponse("Unexpected server error"),
} as const;

export const notFoundResponse = {
  404: errorResponse("Resource not found"),
} as const;

function errorResponse(description: string) {
  return {
    description,
    content: {
      "application/json": { schema: errorEnvelopeSchema },
    },
  };
}
