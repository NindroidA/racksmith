import { z } from "zod";
import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { Prisma } from "@prisma/client";
import { createApiRoute } from "@/lib/api/route-factory";
import {
  singleIpAssignmentResponseSchema,
  updateIpAssignmentBodySchema,
} from "@/lib/api/schemas/ip-assignment";
import {
  commonErrorResponses,
  errorResponse,
  notFoundResponse,
} from "@/lib/api/schemas/shared";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api/response";
import { cuidSchema } from "@/lib/validators";
import { serializeIpAssignment } from "@/lib/api/serializers/ip-assignment";

const paramsSchema = z.object({ id: cuidSchema });

export const GET = createApiRoute({
  method: "GET",
  auth: "member",
  responseSchema: singleIpAssignmentResponseSchema,
  summary: "Fetch an IP assignment",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) {
      return apiError("not_found", "IP assignment not found", 404);
    }
    const assignment = await withTenant(ctx.organizationId, (tx) =>
      tx.ipAssignment.findFirst({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (!assignment) {
      return apiError("not_found", "IP assignment not found", 404);
    }
    return { ipAssignment: serializeIpAssignment(assignment) };
  },
});

export const PATCH = createApiRoute({
  method: "PATCH",
  auth: "member",
  bodySchema: updateIpAssignmentBodySchema,
  responseSchema: singleIpAssignmentResponseSchema,
  summary: "Update an IP assignment",
  handler: async ({ body, params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) {
      return apiError("not_found", "IP assignment not found", 404);
    }

    // body is Partial<CreateIpAssignmentBody>. Build the update payload from
    // the keys actually present so PATCH semantics match Phase 11 (a missing
    // field stays as-is rather than getting cleared).
    const data: Record<string, unknown> = {};
    if (body.subnetId !== undefined) data.subnetId = body.subnetId;
    if (body.ipAddress !== undefined) data.ipAddress = body.ipAddress;
    if (body.deviceId !== undefined) data.deviceId = body.deviceId;
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;

    try {
      const result = await withTenant(ctx.organizationId, async (tx) => {
        // If subnetId or deviceId is being changed, validate the new
        // reference exists in the same org. P2003 below would catch a
        // bogus FK, but the wire-truthful answer for "wrong subnet" is
        // a 404 with a precise message, not a generic validation error.
        if (body.subnetId !== undefined) {
          const subnet = await tx.subnet.findFirst({
            where: { id: body.subnetId, organizationId: ctx.organizationId },
            select: { id: true },
          });
          if (!subnet) return { kind: "subnet_notfound" as const };
        }
        if (body.deviceId) {
          const device = await tx.device.findFirst({
            where: { id: body.deviceId, organizationId: ctx.organizationId },
            select: { id: true },
          });
          if (!device) return { kind: "device_notfound" as const };
        }

        const updated = await tx.ipAssignment.updateMany({
          where: { id: p.data.id, organizationId: ctx.organizationId },
          data,
        });
        if (updated.count === 0) return { kind: "notfound" as const };
        const fresh = await tx.ipAssignment.findFirst({
          where: { id: p.data.id, organizationId: ctx.organizationId },
        });
        return { kind: "ok" as const, assignment: fresh };
      });

      if (result.kind === "subnet_notfound") {
        return apiError("not_found", "Subnet not found", 404);
      }
      if (result.kind === "device_notfound") {
        return apiError("not_found", "Device not found", 404);
      }
      if (result.kind === "notfound" || !result.assignment) {
        return apiError("not_found", "IP assignment not found", 404);
      }

      await audit({
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        action: "updated",
        entityType: "ip_assignment",
        entityId: p.data.id,
        changes: { ...body, via: "api", apiKeyId: ctx.apiKeyId },
      });
      return { ipAssignment: serializeIpAssignment(result.assignment) };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return apiError(
          "conflict",
          "An IP assignment with this address already exists in this subnet",
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
  summary: "Delete an IP assignment",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) {
      return apiError("not_found", "IP assignment not found", 404);
    }

    const result = await withTenant(ctx.organizationId, (tx) =>
      tx.ipAssignment.deleteMany({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (result.count === 0) {
      return apiError("not_found", "IP assignment not found", 404);
    }

    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "deleted",
      entityType: "ip_assignment",
      entityId: p.data.id,
      changes: { via: "api", apiKeyId: ctx.apiKeyId },
    });
    return {};
  },
});

export function registerRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "get",
    path: "/api/v1/ip-assignments/{id}",
    summary: "Fetch an IP assignment",
    security: [{ bearerAuth: [] }],
    request: { params: paramsSchema },
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: singleIpAssignmentResponseSchema },
        },
      },
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/ip-assignments/{id}",
    summary: "Update an IP assignment",
    security: [{ bearerAuth: [] }],
    request: {
      params: paramsSchema,
      body: {
        required: true,
        content: {
          "application/json": { schema: updateIpAssignmentBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: singleIpAssignmentResponseSchema },
        },
      },
      409: errorResponse("Duplicate IP within the subnet"),
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/v1/ip-assignments/{id}",
    summary: "Delete an IP assignment (admin+)",
    security: [{ bearerAuth: [] }],
    request: { params: paramsSchema },
    responses: {
      204: { description: "Deleted" },
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
}
