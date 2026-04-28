import { z } from "zod";
import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { createApiRoute } from "@/lib/api/route-factory";
import {
  singleConnectionResponseSchema,
  updateConnectionBodySchema,
} from "@/lib/api/schemas/connection";
import {
  commonErrorResponses,
  notFoundResponse,
} from "@/lib/api/schemas/shared";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api/response";
import { cuidSchema } from "@/lib/validators";
import { serializeConnection } from "@/lib/api/serializers/connection";

const paramsSchema = z.object({ id: cuidSchema });

export const GET = createApiRoute({
  method: "GET",
  auth: "member",
  responseSchema: singleConnectionResponseSchema,
  summary: "Fetch a connection",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "Connection not found", 404);
    const connection = await withTenant(ctx.organizationId, (tx) =>
      tx.connection.findFirst({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (!connection) return apiError("not_found", "Connection not found", 404);
    return { connection: serializeConnection(connection) };
  },
});

export const PATCH = createApiRoute({
  method: "PATCH",
  auth: "member",
  bodySchema: updateConnectionBodySchema,
  responseSchema: singleConnectionResponseSchema,
  summary: "Update a connection",
  handler: async ({ body, params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "Connection not found", 404);

    // Build the update payload from explicitly-provided keys. PATCH
    // semantics: a missing field stays as-is rather than getting cleared.
    const data: Record<string, unknown> = {};
    if (body.sourceDeviceId !== undefined) {
      data.sourceDeviceId = body.sourceDeviceId;
    }
    if (body.sourcePort !== undefined) data.sourcePort = body.sourcePort;
    if (body.targetDeviceId !== undefined) {
      data.targetDeviceId = body.targetDeviceId;
    }
    if (body.targetPort !== undefined) data.targetPort = body.targetPort;
    if (body.cableType !== undefined) data.cableType = body.cableType;
    if (body.cableLengthFt !== undefined) {
      data.cableLengthFt = body.cableLengthFt;
    }
    if (body.vlan !== undefined) data.vlan = body.vlan;
    if (body.bandwidth !== undefined) data.bandwidth = body.bandwidth;
    if (body.description !== undefined) data.description = body.description;

    const result = await withTenant(ctx.organizationId, async (tx) => {
      const existing = await tx.connection.findFirst({
        where: { id: p.data.id, organizationId: ctx.organizationId },
        select: { sourceDeviceId: true, targetDeviceId: true },
      });
      if (!existing) return { kind: "notfound" as const };

      // Self-loop check on the *post-merge* state. The schema's refine
      // only catches "both sides set + equal in one body"; a single-
      // side patch could still produce a loop relative to the existing
      // row (e.g. PATCH sourceDeviceId to match the unchanged target).
      const newSource = body.sourceDeviceId ?? existing.sourceDeviceId;
      const newTarget = body.targetDeviceId ?? existing.targetDeviceId;
      if (newSource === newTarget) {
        return { kind: "self_loop" as const };
      }

      // Re-validate device ownership for any side that's actually
      // changing. Skip the lookup when both sides are unchanged — the
      // existing row already proves both endpoints belong to this org.
      const idsToCheck: string[] = [];
      if (body.sourceDeviceId && body.sourceDeviceId !== existing.sourceDeviceId) {
        idsToCheck.push(body.sourceDeviceId);
      }
      if (body.targetDeviceId && body.targetDeviceId !== existing.targetDeviceId) {
        idsToCheck.push(body.targetDeviceId);
      }
      if (idsToCheck.length > 0) {
        const owned = await tx.device.count({
          where: {
            id: { in: idsToCheck },
            organizationId: ctx.organizationId,
          },
        });
        if (owned !== idsToCheck.length) {
          return { kind: "device_notfound" as const };
        }
      }

      const updated = await tx.connection.updateMany({
        where: { id: p.data.id, organizationId: ctx.organizationId },
        data,
      });
      if (updated.count === 0) return { kind: "notfound" as const };
      const fresh = await tx.connection.findFirst({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      });
      return { kind: "ok" as const, connection: fresh };
    });

    if (result.kind === "self_loop") {
      return apiError(
        "validation_failed",
        "A device cannot connect to itself",
        400,
      );
    }
    if (result.kind === "device_notfound") {
      return apiError("not_found", "Source or target device not found", 404);
    }
    if (result.kind === "notfound" || !result.connection) {
      return apiError("not_found", "Connection not found", 404);
    }

    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "updated",
      entityType: "connection",
      entityId: p.data.id,
      changes: { ...body, via: "api", apiKeyId: ctx.apiKeyId },
    });
    return { connection: serializeConnection(result.connection) };
  },
});

// DELETE stays at member rank per the carve-out documented in CLAUDE.md
// and the Phase 12 plan: connections are non-destructive topology metadata
// (a line drawn between two devices, easily recreated). Bumping to admin
// would force every dashboard contributor to escalate just to fix a
// mistyped cable, which isn't the spirit of the admin-rank policy.
export const DELETE = createApiRoute({
  method: "DELETE",
  auth: "member",
  responseSchema: z.object({}), // 204 body ignored
  summary: "Delete a connection",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "Connection not found", 404);

    const result = await withTenant(ctx.organizationId, (tx) =>
      tx.connection.deleteMany({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (result.count === 0) {
      return apiError("not_found", "Connection not found", 404);
    }

    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "deleted",
      entityType: "connection",
      entityId: p.data.id,
      changes: { via: "api", apiKeyId: ctx.apiKeyId },
    });
    return {};
  },
});

export function registerRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "get",
    path: "/api/v1/connections/{id}",
    summary: "Fetch a connection",
    security: [{ bearerAuth: [] }],
    request: { params: paramsSchema },
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: singleConnectionResponseSchema },
        },
      },
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/connections/{id}",
    summary: "Update a connection",
    security: [{ bearerAuth: [] }],
    request: {
      params: paramsSchema,
      body: {
        required: true,
        content: {
          "application/json": { schema: updateConnectionBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: singleConnectionResponseSchema },
        },
      },
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/v1/connections/{id}",
    summary: "Delete a connection (member+; non-destructive metadata carve-out)",
    security: [{ bearerAuth: [] }],
    request: { params: paramsSchema },
    responses: {
      204: { description: "Deleted" },
      ...commonErrorResponses,
      ...notFoundResponse,
    },
  });
}
