import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { Prisma } from "@prisma/client";
import { createApiRoute } from "@/lib/api/route-factory";
import {
  createIpAssignmentBodySchema,
  listIpAssignmentsQuerySchema,
  listIpAssignmentsResponseSchema,
  singleIpAssignmentResponseSchema,
} from "@/lib/api/schemas/ip-assignment";
import { commonErrorResponses, errorResponse } from "@/lib/api/schemas/shared";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api/response";
import { serializeIpAssignment } from "@/lib/api/serializers/ip-assignment";

export const GET = createApiRoute({
  method: "GET",
  auth: "member",
  responseSchema: listIpAssignmentsResponseSchema,
  summary: "List IP assignments",
  description:
    "Paginated list of IP assignments in the authenticated organization. Filterable by `subnetId`, `status`, `deviceId`.",
  handler: async ({ ctx, searchParams }) => {
    const q = listIpAssignmentsQuerySchema.safeParse(
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
    const { limit, offset, subnetId, status, deviceId } = q.data;

    const where = {
      organizationId: ctx.organizationId,
      ...(subnetId ? { subnetId } : {}),
      ...(status ? { status } : {}),
      ...(deviceId ? { deviceId } : {}),
    };

    const [rows, total] = await withTenant(ctx.organizationId, (tx) =>
      Promise.all([
        tx.ipAssignment.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        }),
        tx.ipAssignment.count({ where }),
      ]),
    );

    return {
      ipAssignments: rows.map(serializeIpAssignment),
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
  bodySchema: createIpAssignmentBodySchema,
  responseSchema: singleIpAssignmentResponseSchema,
  summary: "Create an IP assignment",
  handler: async ({ body, ctx }) => {
    // Verify the referenced subnet belongs to this org *before* the FK
    // hits Postgres. RLS would silently hide a cross-tenant subnet, so
    // a P2003 with a generic message is what the caller would otherwise
    // see — instead, surface a precise 404. Same contract for `deviceId`
    // when provided.
    try {
      const result = await withTenant(ctx.organizationId, async (tx) => {
        const subnet = await tx.subnet.findFirst({
          where: { id: body.subnetId, organizationId: ctx.organizationId },
          select: { id: true },
        });
        if (!subnet) return { kind: "subnet_notfound" as const };

        if (body.deviceId) {
          const device = await tx.device.findFirst({
            where: { id: body.deviceId, organizationId: ctx.organizationId },
            select: { id: true },
          });
          if (!device) return { kind: "device_notfound" as const };
        }

        const assignment = await tx.ipAssignment.create({
          data: {
            userId: ctx.userId,
            organizationId: ctx.organizationId,
            subnetId: body.subnetId,
            ipAddress: body.ipAddress,
            deviceId: body.deviceId,
            status: body.status,
            notes: body.notes,
          },
        });
        return { kind: "ok" as const, assignment };
      });

      if (result.kind === "subnet_notfound") {
        return apiError("not_found", "Subnet not found", 404);
      }
      if (result.kind === "device_notfound") {
        return apiError("not_found", "Device not found", 404);
      }

      await audit({
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        action: "created",
        entityType: "ip_assignment",
        entityId: result.assignment.id,
        changes: {
          subnetId: body.subnetId,
          ipAddress: body.ipAddress,
          status: body.status,
          via: "api",
          apiKeyId: ctx.apiKeyId,
        },
      });
      return { ipAssignment: serializeIpAssignment(result.assignment) };
    } catch (e) {
      // Unique constraint on (subnetId, ipAddress) — duplicate IP within
      // the same subnet. Surface as 409.
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

export function registerRoutes(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: "get",
    path: "/api/v1/ip-assignments",
    summary: "List IP assignments",
    security: [{ bearerAuth: [] }],
    request: { query: listIpAssignmentsQuerySchema },
    responses: {
      200: {
        description: "Paginated IP assignments",
        content: {
          "application/json": { schema: listIpAssignmentsResponseSchema },
        },
      },
      ...commonErrorResponses,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/ip-assignments",
    summary: "Create an IP assignment",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: {
          "application/json": { schema: createIpAssignmentBodySchema },
        },
      },
    },
    responses: {
      201: {
        description: "Created",
        content: {
          "application/json": { schema: singleIpAssignmentResponseSchema },
        },
      },
      404: errorResponse("Referenced subnet or device not found"),
      409: errorResponse("Duplicate IP within the subnet"),
      ...commonErrorResponses,
    },
  });
}
