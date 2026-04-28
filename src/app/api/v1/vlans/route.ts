import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { Prisma } from "@prisma/client";
import { createApiRoute } from "@/lib/api/route-factory";
import {
  createVlanBodySchema,
  listVlansQuerySchema,
  listVlansResponseSchema,
  singleVlanResponseSchema,
} from "@/lib/api/schemas/vlan";
import { commonErrorResponses } from "@/lib/api/schemas/shared";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { canCreateVlanLocked } from "@/lib/tiers";
import { apiError } from "@/lib/api/response";
import { serializeVlan } from "@/lib/api/serializers/vlan";

export const GET = createApiRoute({
  method: "GET",
  auth: "member",
  responseSchema: listVlansResponseSchema,
  summary: "List VLANs",
  description:
    "Paginated list of VLANs in the authenticated organization. Optionally filter by `purpose`.",
  handler: async ({ ctx, searchParams }) => {
    const q = listVlansQuerySchema.safeParse(Object.fromEntries(searchParams));
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
    const { limit, offset, purpose } = q.data;

    const where = {
      organizationId: ctx.organizationId,
      ...(purpose ? { purpose } : {}),
    };

    const [rows, total] = await withTenant(ctx.organizationId, (tx) =>
      Promise.all([
        tx.vlan.findMany({
          where,
          orderBy: { vlanId: "asc" },
          skip: offset,
          take: limit,
        }),
        tx.vlan.count({ where }),
      ]),
    );

    return {
      vlans: rows.map(serializeVlan),
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
  bodySchema: createVlanBodySchema,
  responseSchema: singleVlanResponseSchema,
  summary: "Create a VLAN",
  handler: async ({ body, ctx }) => {
    try {
      const created = await withTenant(ctx.organizationId, async (tx) => {
        const check = await canCreateVlanLocked(tx, ctx.organizationId);
        if (!check.ok) return { kind: "denied" as const, reason: check.reason };
        const vlan = await tx.vlan.create({
          data: {
            userId: ctx.userId,
            organizationId: ctx.organizationId,
            vlanId: body.vlanId,
            name: body.name,
            description: body.description,
            colorTag: body.color,
            purpose: body.purpose,
          },
        });
        return { kind: "ok" as const, vlan };
      });

      if (created.kind === "denied") {
        return apiError("tier_limit_reached", created.reason, 403);
      }

      await audit({
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        action: "created",
        entityType: "vlan",
        entityId: created.vlan.id,
        changes: {
          vlanId: body.vlanId,
          name: body.name,
          via: "api",
          apiKeyId: ctx.apiKeyId,
        },
      });
      return { vlan: serializeVlan(created.vlan) };
    } catch (e) {
      // Unique constraint on (organizationId, vlanId) — duplicate VLAN ID
      // within the same org. Surface as 409.
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

export function registerRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "get",
    path: "/api/v1/vlans",
    summary: "List VLANs",
    security: [{ bearerAuth: [] }],
    request: { query: listVlansQuerySchema },
    responses: {
      200: {
        description: "Paginated VLANs",
        content: {
          "application/json": { schema: listVlansResponseSchema },
        },
      },
      ...commonErrorResponses,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/vlans",
    summary: "Create a VLAN",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: {
          "application/json": { schema: createVlanBodySchema },
        },
      },
    },
    responses: {
      201: {
        description: "Created",
        content: {
          "application/json": { schema: singleVlanResponseSchema },
        },
      },
      409: {
        description: "Duplicate VLAN ID within the organization",
      },
      ...commonErrorResponses,
    },
  });
}
