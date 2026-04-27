import { z } from "zod";
import { createApiRoute } from "@/lib/api/route-factory";
import { registry } from "@/lib/api/openapi-registry";
import {
  singleRackResponseSchema,
  updateRackBodySchema,
} from "@/lib/api/schemas/rack";
import {
  commonErrorResponses,
  notFoundResponse,
} from "@/lib/api/schemas/shared";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api/response";
import { cuidSchema } from "@/lib/validators";
import type { ColorTag } from "@/types";

const paramsSchema = z.object({ id: cuidSchema });

// Same mapping as /api/v1/racks/route.ts serializeRack — copy rather than
// extract a helper since only two call sites exist. Phase 12 (more resources)
// can refactor if the pattern repeats.
function serializeRack(row: {
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

export const GET = createApiRoute({
  method: "GET",
  auth: "member",
  responseSchema: singleRackResponseSchema,
  summary: "Fetch a rack",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "Rack not found", 404);
    const rack = await withTenant(ctx.organizationId, (tx) =>
      tx.rack.findFirst({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (!rack) return apiError("not_found", "Rack not found", 404);
    return { rack: serializeRack(rack) };
  },
});

export const PATCH = createApiRoute({
  method: "PATCH",
  auth: "member",
  bodySchema: updateRackBodySchema,
  responseSchema: singleRackResponseSchema,
  summary: "Update a rack",
  handler: async ({ body, params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "Rack not found", 404);

    // Map API `color` → Prisma `colorTag`, `null` location → "" on write.
    // body is Partial<CreateRackBody> so every field is optional — only
    // include mapped fields when explicitly set by the caller.
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.sizeU !== undefined) data.sizeU = body.sizeU;
    if (body.location !== undefined) data.location = body.location ?? "";
    if (body.color !== undefined) data.colorTag = body.color;

    const result = await withTenant(ctx.organizationId, async (tx) => {
      const updated = await tx.rack.updateMany({
        where: { id: p.data.id, organizationId: ctx.organizationId },
        data,
      });
      if (updated.count === 0) return null;
      return tx.rack.findFirst({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      });
    });
    if (!result) return apiError("not_found", "Rack not found", 404);

    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "updated",
      entityType: "rack",
      entityId: p.data.id,
      changes: { ...body, via: "api", apiKeyId: ctx.apiKeyId },
    });
    return { rack: serializeRack(result) };
  },
});

export const DELETE = createApiRoute({
  method: "DELETE",
  auth: "admin",
  responseSchema: z.object({}), // 204 body ignored
  summary: "Delete a rack",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "Rack not found", 404);

    const result = await withTenant(ctx.organizationId, (tx) =>
      tx.rack.deleteMany({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (result.count === 0) return apiError("not_found", "Rack not found", 404);

    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "deleted",
      entityType: "rack",
      entityId: p.data.id,
      changes: { via: "api", apiKeyId: ctx.apiKeyId },
    });
    return {};
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/racks/{id}",
  summary: "Fetch a rack",
  security: [{ bearerAuth: [] }],
  request: { params: paramsSchema },
  responses: {
    200: {
      description: "OK",
      content: { "application/json": { schema: singleRackResponseSchema } },
    },
    ...commonErrorResponses,
    ...notFoundResponse,
  },
});
registry.registerPath({
  method: "patch",
  path: "/api/v1/racks/{id}",
  summary: "Update a rack",
  security: [{ bearerAuth: [] }],
  request: {
    params: paramsSchema,
    body: {
      required: true,
      content: { "application/json": { schema: updateRackBodySchema } },
    },
  },
  responses: {
    200: {
      description: "OK",
      content: { "application/json": { schema: singleRackResponseSchema } },
    },
    ...commonErrorResponses,
    ...notFoundResponse,
  },
});
registry.registerPath({
  method: "delete",
  path: "/api/v1/racks/{id}",
  summary: "Delete a rack (admin+)",
  security: [{ bearerAuth: [] }],
  request: { params: paramsSchema },
  responses: {
    204: { description: "Deleted" },
    ...commonErrorResponses,
    ...notFoundResponse,
  },
});
