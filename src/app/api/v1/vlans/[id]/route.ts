import { z } from "zod";
import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { Prisma } from "@prisma/client";
import { createApiRoute } from "@/lib/api/route-factory";
import {
  singleVlanResponseSchema,
  updateVlanBodySchema,
} from "@/lib/api/schemas/vlan";
import {
  commonErrorResponses,
  notFoundResponse,
} from "@/lib/api/schemas/shared";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api/response";
import { cuidSchema } from "@/lib/validators";
import { serializeVlan } from "@/lib/api/serializers/vlan";

const paramsSchema = z.object({ id: cuidSchema });

export const GET = createApiRoute({
  method: "GET",
  auth: "member",
  responseSchema: singleVlanResponseSchema,
  summary: "Fetch a VLAN",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "VLAN not found", 404);
    const vlan = await withTenant(ctx.organizationId, (tx) =>
      tx.vlan.findFirst({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (!vlan) return apiError("not_found", "VLAN not found", 404);
    return { vlan: serializeVlan(vlan) };
  },
});

export const PATCH = createApiRoute({
  method: "PATCH",
  auth: "member",
  bodySchema: updateVlanBodySchema,
  responseSchema: singleVlanResponseSchema,
  summary: "Update a VLAN",
  handler: async ({ body, params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "VLAN not found", 404);

    const data: Record<string, unknown> = {};
    if (body.vlanId !== undefined) data.vlanId = body.vlanId;
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.color !== undefined) data.colorTag = body.color;
    if (body.purpose !== undefined) data.purpose = body.purpose;

    try {
      const result = await withTenant(ctx.organizationId, async (tx) => {
        const updated = await tx.vlan.updateMany({
          where: { id: p.data.id, organizationId: ctx.organizationId },
          data,
        });
        if (updated.count === 0) return null;
        return tx.vlan.findFirst({
          where: { id: p.data.id, organizationId: ctx.organizationId },
        });
      });
      if (!result) return apiError("not_found", "VLAN not found", 404);

      await audit({
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        action: "updated",
        entityType: "vlan",
        entityId: p.data.id,
        changes: { ...body, via: "api", apiKeyId: ctx.apiKeyId },
      });
      return { vlan: serializeVlan(result) };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return apiError(
          "conflict",
          "A VLAN with this ID already exists in this organization",
          409,
        );
      }
      throw e;
    }
  },
});

export const DELETE = createApiRoute({
  method: "DELETE",
  auth: "admin",
  responseSchema: z.object({}), // 204 body ignored
  summary: "Delete a VLAN",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "VLAN not found", 404);

    const result = await withTenant(ctx.organizationId, (tx) =>
      tx.vlan.deleteMany({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (result.count === 0) return apiError("not_found", "VLAN not found", 404);

    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "deleted",
      entityType: "vlan",
      entityId: p.data.id,
      changes: { via: "api", apiKeyId: ctx.apiKeyId },
    });
    return {};
  },
});

export function registerRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "get",
    path: "/api/v1/vlans/{id}",
    summary: "Fetch a VLAN",
    security: [{ bearerAuth: [] }],
    request: { params: paramsSchema },
    responses: {
      200: {
        description: "OK",
        content: { "application/json": { schema: singleVlanResponseSchema } },
      },
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/vlans/{id}",
    summary: "Update a VLAN",
    security: [{ bearerAuth: [] }],
    request: {
      params: paramsSchema,
      body: {
        required: true,
        content: { "application/json": { schema: updateVlanBodySchema } },
      },
    },
    responses: {
      200: {
        description: "OK",
        content: { "application/json": { schema: singleVlanResponseSchema } },
      },
      409: { description: "Duplicate VLAN ID within the organization" },
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/v1/vlans/{id}",
    summary: "Delete a VLAN (admin+)",
    security: [{ bearerAuth: [] }],
    request: { params: paramsSchema },
    responses: {
      204: { description: "Deleted" },
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
}
