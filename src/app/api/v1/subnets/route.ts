import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { Prisma } from "@prisma/client";
import { createApiRoute } from "@/lib/api/route-factory";
import {
  createSubnetBodySchema,
  listSubnetsQuerySchema,
  listSubnetsResponseSchema,
  singleSubnetResponseSchema,
} from "@/lib/api/schemas/subnet";
import { commonErrorResponses, errorResponse } from "@/lib/api/schemas/shared";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { canCreateSubnetLocked } from "@/lib/tiers";
import { apiError } from "@/lib/api/response";
import { serializeSubnet } from "@/lib/api/serializers/subnet";

export const GET = createApiRoute({
  method: "GET",
  auth: "member",
  responseSchema: listSubnetsResponseSchema,
  summary: "List subnets",
  description:
    "Paginated list of subnets in the authenticated organization. Optionally filter by `vlanId`.",
  handler: async ({ ctx, searchParams }) => {
    const q = listSubnetsQuerySchema.safeParse(
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
    const { limit, offset, vlanId } = q.data;

    const where = {
      organizationId: ctx.organizationId,
      ...(vlanId ? { vlanId } : {}),
    };

    const [rows, total] = await withTenant(ctx.organizationId, (tx) =>
      Promise.all([
        tx.subnet.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        }),
        tx.subnet.count({ where }),
      ]),
    );

    return {
      subnets: rows.map(serializeSubnet),
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
  bodySchema: createSubnetBodySchema,
  responseSchema: singleSubnetResponseSchema,
  summary: "Create a subnet",
  handler: async ({ body, ctx }) => {
    // dnsServers maps API `null` (absent) → "" (Prisma default) on write,
    // mirroring the dashboard convention. gateway already nullable on both.
    try {
      const created = await withTenant(ctx.organizationId, async (tx) => {
        const check = await canCreateSubnetLocked(tx, ctx.organizationId);
        if (!check.ok) return { kind: "denied" as const, reason: check.reason };
        const subnet = await tx.subnet.create({
          data: {
            userId: ctx.userId,
            organizationId: ctx.organizationId,
            cidr: body.cidr,
            name: body.name,
            description: body.description,
            gateway: body.gateway,
            dnsServers: body.dnsServers ?? "",
            colorTag: body.color,
            vlanId: body.vlanId,
          },
        });
        return { kind: "ok" as const, subnet };
      });

      if (created.kind === "denied") {
        return apiError("tier_limit_reached", created.reason, 403);
      }

      await audit({
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        action: "created",
        entityType: "subnet",
        entityId: created.subnet.id,
        changes: {
          cidr: body.cidr,
          name: body.name,
          via: "api",
          apiKeyId: ctx.apiKeyId,
        },
      });
      return { subnet: serializeSubnet(created.subnet) };
    } catch (e) {
      // Unique constraint on (organizationId, cidr) — duplicate CIDR within
      // the same org. Surface as 409 with a descriptive code. Foreign-key
      // failures (vlanId pointing at a non-existent / cross-tenant VLAN) are
      // handled by the P2003 branch below as a 400 validation_failed.
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
      // Foreign key violation — vlanId points at a non-existent vlan, or
      // (more rarely) a vlan in another org that RLS hid. Either way the
      // wire-truthful response is "vlanId not found".
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

export function registerRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "get",
    path: "/api/v1/subnets",
    summary: "List subnets",
    security: [{ bearerAuth: [] }],
    request: { query: listSubnetsQuerySchema },
    responses: {
      200: {
        description: "Paginated subnets",
        content: {
          "application/json": { schema: listSubnetsResponseSchema },
        },
      },
      ...commonErrorResponses,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/subnets",
    summary: "Create a subnet",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: {
          "application/json": { schema: createSubnetBodySchema },
        },
      },
    },
    responses: {
      201: {
        description: "Created",
        content: {
          "application/json": { schema: singleSubnetResponseSchema },
        },
      },
      409: errorResponse("Duplicate CIDR within the organization"),
      ...commonErrorResponses,
    },
  });
}
