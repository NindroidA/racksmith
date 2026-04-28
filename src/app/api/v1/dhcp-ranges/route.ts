import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { createApiRoute } from "@/lib/api/route-factory";
import {
  createDhcpRangeBodySchema,
  listDhcpRangesQuerySchema,
  listDhcpRangesResponseSchema,
  singleDhcpRangeResponseSchema,
} from "@/lib/api/schemas/dhcp-range";
import { commonErrorResponses, errorResponse } from "@/lib/api/schemas/shared";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api/response";
import { serializeDhcpRange } from "@/lib/api/serializers/dhcp-range";

export const GET = createApiRoute({
  method: "GET",
  auth: "member",
  responseSchema: listDhcpRangesResponseSchema,
  summary: "List DHCP ranges",
  description:
    "Paginated list of DHCP ranges in the authenticated organization. Optionally filter by `subnetId`.",
  handler: async ({ ctx, searchParams }) => {
    const q = listDhcpRangesQuerySchema.safeParse(
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
    const { limit, offset, subnetId } = q.data;

    const where = {
      organizationId: ctx.organizationId,
      ...(subnetId ? { subnetId } : {}),
    };

    // DhcpRange has no `createdAt` column, so order by `id` (cuid encodes
    // creation time in the leading bits — close enough to insertion order
    // for a paginated list view).
    const [rows, total] = await withTenant(ctx.organizationId, (tx) =>
      Promise.all([
        tx.dhcpRange.findMany({
          where,
          orderBy: { id: "desc" },
          skip: offset,
          take: limit,
        }),
        tx.dhcpRange.count({ where }),
      ]),
    );

    return {
      dhcpRanges: rows.map(serializeDhcpRange),
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
  bodySchema: createDhcpRangeBodySchema,
  responseSchema: singleDhcpRangeResponseSchema,
  summary: "Create a DHCP range",
  handler: async ({ body, ctx }) => {
    // Verify subnet exists in same org before the FK hits Postgres so a
    // cross-tenant subnet ID returns 404 (not the generic Prisma P2003).
    const result = await withTenant(ctx.organizationId, async (tx) => {
      const subnet = await tx.subnet.findFirst({
        where: { id: body.subnetId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!subnet) return { kind: "subnet_notfound" as const };

      const range = await tx.dhcpRange.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          subnetId: body.subnetId,
          startIp: body.startIp,
          endIp: body.endIp,
          label: body.label,
        },
      });
      return { kind: "ok" as const, range };
    });

    if (result.kind === "subnet_notfound") {
      return apiError("not_found", "Subnet not found", 404);
    }

    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "created",
      entityType: "dhcp_range",
      entityId: result.range.id,
      changes: {
        subnetId: body.subnetId,
        startIp: body.startIp,
        endIp: body.endIp,
        via: "api",
        apiKeyId: ctx.apiKeyId,
      },
    });
    return { dhcpRange: serializeDhcpRange(result.range) };
  },
});

export function registerRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "get",
    path: "/api/v1/dhcp-ranges",
    summary: "List DHCP ranges",
    security: [{ bearerAuth: [] }],
    request: { query: listDhcpRangesQuerySchema },
    responses: {
      200: {
        description: "Paginated DHCP ranges",
        content: {
          "application/json": { schema: listDhcpRangesResponseSchema },
        },
      },
      ...commonErrorResponses,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/dhcp-ranges",
    summary: "Create a DHCP range",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: {
          "application/json": { schema: createDhcpRangeBodySchema },
        },
      },
    },
    responses: {
      201: {
        description: "Created",
        content: {
          "application/json": { schema: singleDhcpRangeResponseSchema },
        },
      },
      404: errorResponse("Referenced subnet not found"),
      ...commonErrorResponses,
    },
  });
}
