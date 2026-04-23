import { createApiRoute } from "@/lib/api/route-factory";
import { registry } from "@/lib/api/openapi-registry";
import {
  createRackBodySchema,
  listRacksQuerySchema,
  listRacksResponseSchema,
  singleRackResponseSchema,
} from "@/lib/api/schemas/rack";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { canCreateRackLocked } from "@/lib/tiers";
import { apiError } from "@/lib/api/response";
import type { ColorTag } from "@/types";

// Map a Prisma Rack row to the public API shape.
// - colorTag → color (field rename)
// - location "" → null (nullability boundary)
// - createdAt Date → ISO string (matches rackResponseSchema's transform output)
// Both mappings are documented at src/lib/api/schemas/rack.ts top. The cast
// of colorTag to ColorTag is safe: writes go through createRackBodySchema
// which already validates against COLOR_TAGS, and responseSchema.parse in
// the route factory re-validates at runtime before responding.
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
  responseSchema: listRacksResponseSchema,
  summary: "List racks",
  description: "Paginated list of racks in the authenticated organization.",
  handler: async ({ ctx, searchParams }) => {
    const q = listRacksQuerySchema.safeParse(Object.fromEntries(searchParams));
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
    const { limit, offset, location } = q.data;

    const where = {
      organizationId: ctx.organizationId,
      ...(location ? { location } : {}),
    };

    const [rows, total] = await withTenant(ctx.organizationId, (tx) =>
      Promise.all([
        tx.rack.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        }),
        tx.rack.count({ where }),
      ]),
    );

    return {
      racks: rows.map(serializeRack),
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
  bodySchema: createRackBodySchema,
  responseSchema: singleRackResponseSchema,
  summary: "Create a rack",
  handler: async ({ body, ctx }) => {
    const created = await withTenant(ctx.organizationId, async (tx) => {
      const check = await canCreateRackLocked(tx, ctx.organizationId);
      if (!check.ok) return { kind: "denied" as const, reason: check.reason };
      const rack = await tx.rack.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          name: body.name,
          sizeU: body.sizeU,
          // body.location is string | null; schema defaults to null for omitted.
          // Prisma column is String @default(""). Map null → "" on write.
          location: body.location ?? "",
          // body.color (API) → colorTag (Prisma)
          colorTag: body.color,
        },
      });
      return { kind: "ok" as const, rack };
    });
    if (created.kind === "denied") {
      return apiError("tier_limit_reached", created.reason, 403);
    }
    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "created",
      entityType: "rack",
      entityId: created.rack.id,
      changes: {
        name: body.name,
        sizeU: body.sizeU,
        via: "api",
        apiKeyId: ctx.apiKeyId,
      },
    });
    return { rack: serializeRack(created.rack) };
  },
});

// Register the route paths with OpenAPI. These descriptors feed Scalar docs.
registry.registerPath({
  method: "get",
  path: "/api/v1/racks",
  summary: "List racks",
  security: [{ bearerAuth: [] }],
  request: { query: listRacksQuerySchema },
  responses: {
    200: {
      description: "Paginated racks",
      content: {
        "application/json": { schema: listRacksResponseSchema },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/racks",
  summary: "Create a rack",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: createRackBodySchema },
      },
    },
  },
  responses: {
    201: {
      description: "Created",
      content: {
        "application/json": { schema: singleRackResponseSchema },
      },
    },
  },
});
