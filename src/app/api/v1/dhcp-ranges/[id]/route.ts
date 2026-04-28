import { z } from "zod";
import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { createApiRoute } from "@/lib/api/route-factory";
import {
  singleDhcpRangeResponseSchema,
  updateDhcpRangeBodySchema,
} from "@/lib/api/schemas/dhcp-range";
import { commonErrorResponses, notFoundResponse } from "@/lib/api/schemas/shared";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api/response";
import { cuidSchema } from "@/lib/validators";
import { serializeDhcpRange } from "@/lib/api/serializers/dhcp-range";

const paramsSchema = z.object({ id: cuidSchema });

export const GET = createApiRoute({
  method: "GET",
  auth: "member",
  responseSchema: singleDhcpRangeResponseSchema,
  summary: "Fetch a DHCP range",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "DHCP range not found", 404);
    const range = await withTenant(ctx.organizationId, (tx) =>
      tx.dhcpRange.findFirst({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (!range) return apiError("not_found", "DHCP range not found", 404);
    return { dhcpRange: serializeDhcpRange(range) };
  },
});

export const PATCH = createApiRoute({
  method: "PATCH",
  auth: "member",
  bodySchema: updateDhcpRangeBodySchema,
  responseSchema: singleDhcpRangeResponseSchema,
  summary: "Update a DHCP range",
  handler: async ({ body, params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "DHCP range not found", 404);

    const data: Record<string, unknown> = {};
    if (body.subnetId !== undefined) data.subnetId = body.subnetId;
    if (body.startIp !== undefined) data.startIp = body.startIp;
    if (body.endIp !== undefined) data.endIp = body.endIp;
    if (body.label !== undefined) data.label = body.label;

    const result = await withTenant(ctx.organizationId, async (tx) => {
      // Re-validate subnetId on PATCH the same as POST: cross-tenant subnet
      // → 404, not a generic Prisma FK error.
      if (body.subnetId !== undefined) {
        const subnet = await tx.subnet.findFirst({
          where: { id: body.subnetId, organizationId: ctx.organizationId },
          select: { id: true },
        });
        if (!subnet) return { kind: "subnet_notfound" as const };
      }
      const updated = await tx.dhcpRange.updateMany({
        where: { id: p.data.id, organizationId: ctx.organizationId },
        data,
      });
      if (updated.count === 0) return { kind: "notfound" as const };
      const fresh = await tx.dhcpRange.findFirst({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      });
      return { kind: "ok" as const, range: fresh };
    });

    if (result.kind === "subnet_notfound") {
      return apiError("not_found", "Subnet not found", 404);
    }
    if (result.kind === "notfound" || !result.range) {
      return apiError("not_found", "DHCP range not found", 404);
    }

    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "updated",
      entityType: "dhcp_range",
      entityId: p.data.id,
      changes: { ...body, via: "api", apiKeyId: ctx.apiKeyId },
    });
    return { dhcpRange: serializeDhcpRange(result.range) };
  },
});

export const DELETE = createApiRoute({
  method: "DELETE",
  auth: "admin",
  responseSchema: z.object({}), // 204 body ignored
  summary: "Delete a DHCP range",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "DHCP range not found", 404);

    const result = await withTenant(ctx.organizationId, (tx) =>
      tx.dhcpRange.deleteMany({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (result.count === 0) {
      return apiError("not_found", "DHCP range not found", 404);
    }

    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "deleted",
      entityType: "dhcp_range",
      entityId: p.data.id,
      changes: { via: "api", apiKeyId: ctx.apiKeyId },
    });
    return {};
  },
});

export function registerRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "get",
    path: "/api/v1/dhcp-ranges/{id}",
    summary: "Fetch a DHCP range",
    security: [{ bearerAuth: [] }],
    request: { params: paramsSchema },
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: singleDhcpRangeResponseSchema },
        },
      },
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/dhcp-ranges/{id}",
    summary: "Update a DHCP range",
    security: [{ bearerAuth: [] }],
    request: {
      params: paramsSchema,
      body: {
        required: true,
        content: {
          "application/json": { schema: updateDhcpRangeBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: singleDhcpRangeResponseSchema },
        },
      },
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/v1/dhcp-ranges/{id}",
    summary: "Delete a DHCP range (admin+)",
    security: [{ bearerAuth: [] }],
    request: { params: paramsSchema },
    responses: {
      204: { description: "Deleted" },
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
}
