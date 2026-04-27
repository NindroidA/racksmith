import { z } from "zod";
import { createApiRoute } from "@/lib/api/route-factory";
import { registry } from "@/lib/api/openapi-registry";
import {
  singleDeviceResponseSchema,
  updateDeviceBodySchema,
} from "@/lib/api/schemas/device";
import {
  commonErrorResponses,
  notFoundResponse,
} from "@/lib/api/schemas/shared";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api/response";
import { cuidSchema } from "@/lib/validators";
import type { DeviceType } from "@/types";

const paramsSchema = z.object({ id: cuidSchema });

// Identical to serializeDevice in ../route.ts. Copy-paste until Phase 12
// when more resources make a shared helper worthwhile.
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
  responseSchema: singleDeviceResponseSchema,
  summary: "Fetch a device",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "Device not found", 404);
    const device = await withTenant(ctx.organizationId, (tx) =>
      tx.device.findFirst({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (!device) return apiError("not_found", "Device not found", 404);
    return { device: serializeDevice(device) };
  },
});

export const PATCH = createApiRoute({
  method: "PATCH",
  auth: "member",
  bodySchema: updateDeviceBodySchema,
  responseSchema: singleDeviceResponseSchema,
  summary: "Update a device",
  handler: async ({ body, params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "Device not found", 404);

    const result = await withTenant(ctx.organizationId, async (tx) => {
      // Tenant check: rackId must belong to the caller's org (only when
      // caller is reassigning to a rack — null means "unassign", skip the
      // check). Same enumeration-safe 404 as POST.
      if (body.rackId) {
        const rack = await tx.rack.findFirst({
          where: { id: body.rackId, organizationId: ctx.organizationId },
          select: { id: true },
        });
        if (!rack) return { kind: "bad_rack" as const };
      }

      // Partial data: only include fields the caller explicitly set.
      // body is Partial<CreateDeviceBody> so every field is optional.
      const data: Record<string, unknown> = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.deviceType !== undefined) data.deviceType = body.deviceType;
      if (body.manufacturer !== undefined)
        data.manufacturer = body.manufacturer;
      if (body.model !== undefined) data.model = body.model;
      if (body.sizeU !== undefined) data.sizeU = body.sizeU;
      if (body.portCount !== undefined) data.portCount = body.portCount;
      if (body.powerWatts !== undefined) data.powerWatts = body.powerWatts;
      if (body.rackId !== undefined) data.rackId = body.rackId;
      if (body.positionU !== undefined) data.positionU = body.positionU;
      if (body.ipAddress !== undefined) data.ipAddress = body.ipAddress;
      if (body.macAddress !== undefined) data.macAddress = body.macAddress;
      if (body.hostname !== undefined) data.hostname = body.hostname;

      const updated = await tx.device.updateMany({
        where: { id: p.data.id, organizationId: ctx.organizationId },
        data,
      });
      if (updated.count === 0) return { kind: "not_found" as const };
      // IMPORTANT: findFirst must include organizationId per audit:tenant-filter.
      const device = await tx.device.findFirst({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      });
      return { kind: "ok" as const, device };
    });
    if (result.kind === "bad_rack")
      return apiError(
        "not_found",
        "rackId not found in this organization",
        404,
      );
    if (result.kind === "not_found" || !result.device)
      return apiError("not_found", "Device not found", 404);

    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "updated",
      entityType: "device",
      entityId: p.data.id,
      changes: { ...body, via: "api", apiKeyId: ctx.apiKeyId },
    });
    return { device: serializeDevice(result.device) };
  },
});

export const DELETE = createApiRoute({
  method: "DELETE",
  auth: "admin",
  responseSchema: z.object({}), // 204 body ignored
  summary: "Delete a device",
  handler: async ({ params, ctx }) => {
    const p = paramsSchema.safeParse(params);
    if (!p.success) return apiError("not_found", "Device not found", 404);

    const result = await withTenant(ctx.organizationId, (tx) =>
      tx.device.deleteMany({
        where: { id: p.data.id, organizationId: ctx.organizationId },
      }),
    );
    if (result.count === 0)
      return apiError("not_found", "Device not found", 404);

    await audit({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      action: "deleted",
      entityType: "device",
      entityId: p.data.id,
      changes: { via: "api", apiKeyId: ctx.apiKeyId },
    });
    return {};
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/devices/{id}",
  summary: "Fetch a device",
  security: [{ bearerAuth: [] }],
  request: { params: paramsSchema },
  responses: {
    200: {
      description: "OK",
      content: { "application/json": { schema: singleDeviceResponseSchema } },
    },
    ...commonErrorResponses,
    ...notFoundResponse,
  },
});
registry.registerPath({
  method: "patch",
  path: "/api/v1/devices/{id}",
  summary: "Update a device",
  security: [{ bearerAuth: [] }],
  request: {
    params: paramsSchema,
    body: {
      required: true,
      content: { "application/json": { schema: updateDeviceBodySchema } },
    },
  },
  responses: {
    200: {
      description: "OK",
      content: { "application/json": { schema: singleDeviceResponseSchema } },
    },
    ...commonErrorResponses,
    ...notFoundResponse,
  },
});
registry.registerPath({
  method: "delete",
  path: "/api/v1/devices/{id}",
  summary: "Delete a device (admin+)",
  security: [{ bearerAuth: [] }],
  request: { params: paramsSchema },
  responses: {
    204: { description: "Deleted" },
    ...commonErrorResponses,
    ...notFoundResponse,
  },
});
