import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { createApiRoute } from "@/lib/api/route-factory";
import {
  createConnectionBodySchema,
  listConnectionsQuerySchema,
  listConnectionsResponseSchema,
  singleConnectionResponseSchema,
} from "@/lib/api/schemas/connection";
import { commonErrorResponses, errorResponse } from "@/lib/api/schemas/shared";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api/response";
import { serializeConnection } from "@/lib/api/serializers/connection";

export const GET = createApiRoute({
  method: "GET",
  auth: "member",
  responseSchema: listConnectionsResponseSchema,
  summary: "List connections",
  description:
    "Paginated list of cable/topology connections in the authenticated organization. Filterable by `sourceDeviceId`, `targetDeviceId`, `cableType`.",
  handler: async ({ ctx, searchParams }) => {
    const q = listConnectionsQuerySchema.safeParse(
      Object.fromEntries(searchParams),
    );
    if (!q.success) {
      return apiError(
        "validation_failed",
        "Invalid query params",
        400,
        q.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      );
    }
    const { limit, offset, sourceDeviceId, targetDeviceId, cableType } = q.data;

    const where = {
      organizationId: ctx.organizationId,
      ...(sourceDeviceId ? { sourceDeviceId } : {}),
      ...(targetDeviceId ? { targetDeviceId } : {}),
      ...(cableType ? { cableType } : {}),
    };

    const [rows, total] = await withTenant(ctx.organizationId, (tx) =>
      Promise.all([
        tx.connection.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        }),
        tx.connection.count({ where }),
      ]),
    );

    return {
      connections: rows.map(serializeConnection),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + rows.length < total,
      },
    };
  },
});

export const POST = createApiRoute({
  method: "POST",
  auth: "member",
  bodySchema: createConnectionBodySchema,
  responseSchema: singleConnectionResponseSchema,
  summary: "Create a connection",
  handler: async ({ body, ctx }) => {
    // Verify both endpoints belong to this org *before* the FK fires.
    // The schema already rejects self-loops (sourceDeviceId !== target),
    // and a single `count({ where: { id: { in: [...] } } })` covers both
    // sides in one query. RLS would have hidden a cross-tenant device,
    // so a count mismatch means at least one id was unknown to this
    // tenant — surface as 404 instead of letting Prisma throw P2003.
    const result = await withTenant(ctx.organizationId, async (tx) => {
      const owned = await tx.device.count({
        where: {
          id: { in: [body.sourceDeviceId, body.targetDeviceId] },
          organizationId: ctx.organizationId,
        },
      });
      if (owned !== 2) return { kind: "device_notfound" as const };

      const connection = await tx.connection.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          sourceDeviceId: body.sourceDeviceId,
          sourcePort: body.sourcePort,
          targetDeviceId: body.targetDeviceId,
          targetPort: body.targetPort,
          cableType: body.cableType,
          cableLengthFt: body.cableLengthFt,
          vlan: body.vlan,
          bandwidth: body.bandwidth,
          description: body.description,
        },
      });
      return { kind: "ok" as const, connection };
    });

    if (result.kind === "device_notfound") {
      return apiError("not_found", "Source or target device not found", 404);
    }

    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "created",
      entityType: "connection",
      entityId: result.connection.id,
      changes: {
        sourceDeviceId: body.sourceDeviceId,
        targetDeviceId: body.targetDeviceId,
        cableType: body.cableType,
        via: "api",
        apiKeyId: ctx.apiKeyId,
      },
    });
    return { connection: serializeConnection(result.connection) };
  },
});

export function registerRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "get",
    path: "/api/v1/connections",
    summary: "List connections",
    security: [{ bearerAuth: [] }],
    request: { query: listConnectionsQuerySchema },
    responses: {
      200: {
        description: "Paginated connections",
        content: {
          "application/json": { schema: listConnectionsResponseSchema },
        },
      },
      ...commonErrorResponses,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/connections",
    summary: "Create a connection",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: {
          "application/json": { schema: createConnectionBodySchema },
        },
      },
    },
    responses: {
      201: {
        description: "Created",
        content: {
          "application/json": { schema: singleConnectionResponseSchema },
        },
      },
      404: errorResponse("Referenced source or target device not found"),
      ...commonErrorResponses,
    },
  });
}
