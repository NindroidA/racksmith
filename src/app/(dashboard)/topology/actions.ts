"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { handleZodError, withActionEnvelope } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/action-types";
import {
  connectionSchema,
  devicePositionSchema,
  type ConnectionInput,
  type DevicePositionInput,
} from "@/lib/validators";

async function assertDeviceOwnership(
  organizationId: string,
  deviceIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const count = await withTenant(organizationId, (tx) =>
    tx.device.count({
      where: { id: { in: deviceIds }, organizationId },
    }),
  );
  if (count !== deviceIds.length) {
    return { ok: false, error: "Device not found or not yours" };
  }
  return { ok: true };
}

export async function createConnection(
  input: ConnectionInput,
): Promise<ActionResult<{ id: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = connectionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }
    const data = parsed.data;

    if (data.sourceDeviceId === data.targetDeviceId) {
      return { ok: false, error: "A device cannot connect to itself" };
    }

    const ownership = await assertDeviceOwnership(organizationId, [
      data.sourceDeviceId,
      data.targetDeviceId,
    ]);
    if (!ownership.ok) return ownership;

    const connection = await withTenant(organizationId, (tx) =>
      tx.connection.create({
        data: {
          userId: session.user.id,
          organizationId,
          sourceDeviceId: data.sourceDeviceId,
          sourcePort: data.sourcePort,
          targetDeviceId: data.targetDeviceId,
          targetPort: data.targetPort,
          cableType: data.cableType,
          cableLengthFt: data.cableLengthFt ?? null,
          vlan: data.vlan ?? null,
          bandwidth: data.bandwidth ?? null,
          description: data.description,
        },
        select: { id: true },
      }),
    );
    await audit({
      userId: session.user.id,
      organizationId,
      action: "created",
      entityType: "connection",
      entityId: connection.id,
      changes: {
        sourceDeviceId: data.sourceDeviceId,
        targetDeviceId: data.targetDeviceId,
        cableType: data.cableType,
      },
    });

    revalidatePath("/topology");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: connection.id } };
  }, "Failed to create connection");
}

export async function updateConnection(
  id: string,
  input: ConnectionInput,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = connectionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }
    const data = parsed.data;

    if (data.sourceDeviceId === data.targetDeviceId) {
      return { ok: false, error: "A device cannot connect to itself" };
    }

    const ownership = await assertDeviceOwnership(organizationId, [
      data.sourceDeviceId,
      data.targetDeviceId,
    ]);
    if (!ownership.ok) return ownership;

    const result = await withTenant(organizationId, (tx) =>
      tx.connection.updateMany({
        where: { id, organizationId },
        data: {
          sourceDeviceId: data.sourceDeviceId,
          targetDeviceId: data.targetDeviceId,
          sourcePort: data.sourcePort,
          targetPort: data.targetPort,
          cableType: data.cableType,
          cableLengthFt: data.cableLengthFt ?? null,
          vlan: data.vlan ?? null,
          bandwidth: data.bandwidth ?? null,
          description: data.description,
        },
      }),
    );
    if (result.count === 0) {
      return { ok: false, error: "Connection not found" };
    }
    await audit({
      userId: session.user.id,
      organizationId,
      action: "updated",
      entityType: "connection",
      entityId: id,
      changes: {
        sourceDeviceId: data.sourceDeviceId,
        targetDeviceId: data.targetDeviceId,
        cableType: data.cableType,
      },
    });
    revalidatePath("/topology");
    return { ok: true, data: undefined };
  }, "Failed to update connection");
}

export async function deleteConnection(id: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const result = await withTenant(organizationId, (tx) =>
      tx.connection.deleteMany({
        where: { id, organizationId },
      }),
    );
    if (result.count === 0) {
      return { ok: false, error: "Connection not found" };
    }
    await audit({
      userId: session.user.id,
      organizationId,
      action: "deleted",
      entityType: "connection",
      entityId: id,
    });
    revalidatePath("/topology");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  }, "Failed to delete");
}

export async function updateDevicePosition(
  input: DevicePositionInput,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = devicePositionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }
    const { deviceId, x, y } = parsed.data;

    const result = await withTenant(organizationId, (tx) =>
      tx.device.updateMany({
        where: { id: deviceId, organizationId },
        data: { canvasX: x, canvasY: y },
      }),
    );
    if (result.count === 0) {
      return { ok: false, error: "Device not found" };
    }
    await audit({
      userId: session.user.id,
      organizationId,
      action: "moved",
      entityType: "device",
      entityId: deviceId,
      changes: { x, y },
      metadata: { surface: "topology_canvas" },
    });
    return { ok: true, data: undefined };
  }, "Failed to save position");
}

/**
 * Simple grid-based auto-layout. Not dagre-level smart, but a reasonable
 * default that gets devices onto the canvas. Sorts devices by connection
 * degree (most-connected first) and places them into a roughly square
 * row-major grid (cols = ceil(sqrt(n)), 320×200 cells).
 */
export async function autoLayout(): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const { devices, connections } = await withTenant(
      organizationId,
      async (tx) => {
        const [devices, connections] = await Promise.all([
          tx.device.findMany({
            where: { organizationId },
            select: { id: true },
            orderBy: { name: "asc" },
          }),
          tx.connection.findMany({
            where: { organizationId },
            select: { sourceDeviceId: true, targetDeviceId: true },
          }),
        ]);
        return { devices, connections };
      },
    );

    if (devices.length === 0) return { ok: true, data: undefined };

    // Count connections per device
    const degree = new Map<string, number>();
    for (const c of connections) {
      degree.set(c.sourceDeviceId, (degree.get(c.sourceDeviceId) ?? 0) + 1);
      degree.set(c.targetDeviceId, (degree.get(c.targetDeviceId) ?? 0) + 1);
    }

    // Sort devices: most-connected first
    const sorted = [...devices].sort(
      (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0),
    );

    const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));
    const cellW = 320;
    const cellH = 200;

    await withTenant(organizationId, async (tx) => {
      for (let i = 0; i < sorted.length; i++) {
        const d = sorted[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        await tx.device.update({
          where: { id: d.id },
          data: { canvasX: col * cellW, canvasY: row * cellH },
        });
      }
    });
    // Aggregate audit row for the bulk operation. Per-device `moved` rows
    // would flood the log (N writes per click); keep intent at the org level
    // and capture the count in changes for downstream pattern detection.
    await audit({
      userId: session.user.id,
      organizationId,
      action: "updated",
      entityType: "organization",
      entityId: organizationId,
      changes: { operation: "auto_layout", deviceCount: sorted.length },
    });
    revalidatePath("/topology");
    return { ok: true, data: undefined };
  }, "Layout failed");
}
