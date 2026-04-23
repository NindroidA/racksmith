import { createApiRoute } from "@/lib/api/route-factory";
import { registry } from "@/lib/api/openapi-registry";
import {
  createDeviceBodySchema,
  listDevicesQuerySchema,
  listDevicesResponseSchema,
  singleDeviceResponseSchema,
} from "@/lib/api/schemas/device";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { canCreateDeviceLocked } from "@/lib/tiers";
import { apiError } from "@/lib/api/response";
import type { DeviceType } from "@/types";

// Map a Prisma Device row to the public API shape. Whitelist-only — excludes
// userId, organizationId, updatedAt, notes, isManual, discoveredAt, lastSeen,
// osFingerprint, canvasX, canvasY (see src/lib/api/schemas/device.ts).
// TODO Phase 12: positionU collision with rack.sizeU + existing devices
// is currently NOT validated at the API layer (dashboard does it via
// src/lib/rack-placement.ts). Add positionU-fit check here when we wire
// up more fine-grained validation.
function serializeDevice(row: {
  id: string;
  name: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  sizeU: number;
  portCount: number;
  powerWatts: number | null;
  rackId: string | null;
  positionU: number | null;
  ipAddress: string | null;
  macAddress: string | null;
  hostname: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    deviceType: row.deviceType as DeviceType,
    manufacturer: row.manufacturer,
    model: row.model,
    sizeU: row.sizeU,
    portCount: row.portCount,
    powerWatts: row.powerWatts,
    rackId: row.rackId,
    positionU: row.positionU,
    ipAddress: row.ipAddress,
    macAddress: row.macAddress,
    hostname: row.hostname,
    createdAt: row.createdAt.toISOString(),
  };
}

export const GET = createApiRoute({
  method: "GET",
  auth: "member",
  responseSchema: listDevicesResponseSchema,
  summary: "List devices",
  description: "Paginated list of devices in the authenticated organization.",
  handler: async ({ ctx, searchParams }) => {
    const q = listDevicesQuerySchema.safeParse(
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
    const { limit, offset, rackId, deviceType, manufacturer } = q.data;

    const where = {
      organizationId: ctx.organizationId,
      ...(rackId ? { rackId } : {}),
      ...(deviceType ? { deviceType } : {}),
      ...(manufacturer
        ? {
            manufacturer: {
              contains: manufacturer,
              mode: "insensitive" as const,
            },
          }
        : {}),
    };

    const [rows, total] = await withTenant(ctx.organizationId, (tx) =>
      Promise.all([
        tx.device.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        }),
        tx.device.count({ where }),
      ]),
    );

    return {
      devices: rows.map(serializeDevice),
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
  bodySchema: createDeviceBodySchema,
  responseSchema: singleDeviceResponseSchema,
  summary: "Create a device",
  handler: async ({ body, ctx }) => {
    const created = await withTenant(ctx.organizationId, async (tx) => {
      const check = await canCreateDeviceLocked(tx, ctx.organizationId);
      if (!check.ok) return { kind: "denied" as const, reason: check.reason };

      // Tenant check: rackId must belong to the caller's org. `z.string().cuid()`
      // on the schema only validates shape; this runtime check prevents
      // cross-tenant rack enumeration via the API. Return 404 (not 403) so
      // callers can't distinguish "rack exists in another tenant" from
      // "rack doesn't exist".
      if (body.rackId) {
        const rack = await tx.rack.findFirst({
          where: { id: body.rackId, organizationId: ctx.organizationId },
          select: { id: true },
        });
        if (!rack) return { kind: "bad_rack" as const };
      }

      const device = await tx.device.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          name: body.name,
          deviceType: body.deviceType,
          manufacturer: body.manufacturer,
          model: body.model,
          sizeU: body.sizeU,
          portCount: body.portCount,
          powerWatts: body.powerWatts,
          rackId: body.rackId,
          positionU: body.positionU,
          ipAddress: body.ipAddress,
          macAddress: body.macAddress,
          hostname: body.hostname,
          isManual: true,
        },
      });
      return { kind: "ok" as const, device };
    });
    if (created.kind === "denied")
      return apiError("tier_limit_reached", created.reason, 403);
    if (created.kind === "bad_rack")
      return apiError("not_found", "rackId not found in this organization", 404);
    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "created",
      entityType: "device",
      entityId: created.device.id,
      changes: {
        name: body.name,
        deviceType: body.deviceType,
        via: "api",
        apiKeyId: ctx.apiKeyId,
      },
    });
    return { device: serializeDevice(created.device) };
  },
});

// Register the route paths with OpenAPI. These descriptors feed Scalar docs.
registry.registerPath({
  method: "get",
  path: "/api/v1/devices",
  summary: "List devices",
  security: [{ bearerAuth: [] }],
  request: { query: listDevicesQuerySchema },
  responses: {
    200: {
      description: "Paginated devices",
      content: {
        "application/json": { schema: listDevicesResponseSchema },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/devices",
  summary: "Create a device",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: createDeviceBodySchema },
      },
    },
  },
  responses: {
    201: {
      description: "Created",
      content: {
        "application/json": { schema: singleDeviceResponseSchema },
      },
    },
  },
});
