import { z } from "zod";
import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { Prisma } from "@prisma/client";
import { createApiRoute } from "@/lib/api/route-factory";
import {
  singleSubnetResponseSchema,
  updateSubnetBodySchema,
} from "@/lib/api/schemas/subnet";
import {
  commonErrorResponses,
  errorResponse,
  notFoundResponse,
} from "@/lib/api/schemas/shared";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api/response";
import { cuidSchema } from "@/lib/validators";
import { serializeSubnet } from "@/lib/api/serializers/subnet";

const paramsSchema = z.object({ id: cuidSchema });

export const GET = createApiRoute({
  method: "GET",
  auth: "member",
  responseSchema: singleSubnetResponseSchema,
  summary: "Fetch a subnet",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "Subnet not found", 404);
    const subnet = await withTenant(ctx.organizationId, (tx) =>
      tx.subnet.findFirst({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (!subnet) return apiError("not_found", "Subnet not found", 404);
    return { subnet: serializeSubnet(subnet) };
  },
});

export const PATCH = createApiRoute({
  method: "PATCH",
  auth: "member",
  bodySchema: updateSubnetBodySchema,
  responseSchema: singleSubnetResponseSchema,
  summary: "Update a subnet",
  handler: async ({ body, params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "Subnet not found", 404);

    // Map API `color` → Prisma `colorTag`, `null` dnsServers → "" on write.
    // body is Partial<CreateSubnetBody> so every field is optional — only
    // include mapped fields when explicitly set by the caller.
    const data: Record<string, unknown> = {};
    if (body.cidr !== undefined) data.cidr = body.cidr;
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.gateway !== undefined) data.gateway = body.gateway;
    if (body.dnsServers !== undefined) data.dnsServers = body.dnsServers ?? "";
    if (body.color !== undefined) data.colorTag = body.color;
    if (body.vlanId !== undefined) data.vlanId = body.vlanId;

    try {
      const result = await withTenant(ctx.organizationId, async (tx) => {
        const updated = await tx.subnet.updateMany({
          where: { id: p.data.id, organizationId: ctx.organizationId },
          data,
        });
        if (updated.count === 0) return null;
        return tx.subnet.findFirst({
          where: { id: p.data.id, organizationId: ctx.organizationId },
        });
      });
      if (!result) return apiError("not_found", "Subnet not found", 404);

      await audit({
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        action: "updated",
        entityType: "subnet",
        entityId: p.data.id,
        changes: { ...body, via: "api", apiKeyId: ctx.apiKeyId },
      });
      return { subnet: serializeSubnet(result) };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return apiError(
          "conflict",
          "A subnet with this CIDR already exists in this organization",
          409,
        );
      }
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2003"
      ) {
        return apiError(
          "validation_failed",
          "vlanId does not reference an existing VLAN",
          400,
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
  summary: "Delete a subnet",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "Subnet not found", 404);

    const result = await withTenant(ctx.organizationId, (tx) =>
      tx.subnet.deleteMany({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (result.count === 0)
      return apiError("not_found", "Subnet not found", 404);

    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "deleted",
      entityType: "subnet",
      entityId: p.data.id,
      changes: { via: "api", apiKeyId: ctx.apiKeyId },
    });
    return {};
  },
});

export function registerRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "get",
    path: "/api/v1/subnets/{id}",
    summary: "Fetch a subnet",
    security: [{ bearerAuth: [] }],
    request: { params: paramsSchema },
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: singleSubnetResponseSchema },
        },
      },
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/subnets/{id}",
    summary: "Update a subnet",
    security: [{ bearerAuth: [] }],
    request: {
      params: paramsSchema,
      body: {
        required: true,
        content: {
          "application/json": { schema: updateSubnetBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: singleSubnetResponseSchema },
        },
      },
      409: errorResponse("Duplicate CIDR within the organization"),
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/v1/subnets/{id}",
    summary: "Delete a subnet (admin+)",
    security: [{ bearerAuth: [] }],
    request: { params: paramsSchema },
    responses: {
      204: { description: "Deleted" },
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
}
