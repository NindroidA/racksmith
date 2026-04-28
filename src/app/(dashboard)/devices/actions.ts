"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { getDeviceTemplate } from "@/lib/templates/devices";
import {
  handleZodError,
  tierDenial,
  withActionEnvelope,
} from "@/lib/action-helpers";
import { validateRackPlacement } from "@/lib/rack-placement";
import type { ActionResult } from "@/lib/action-types";
import { canCreateDeviceLocked, TIER_LIMITS } from "@/lib/tiers";
import {
  deviceSchema,
  deviceImportRowSchema,
  type DeviceInput,
  type DeviceImportRow,
} from "@/lib/validators";

export async function createDevice(
  input: DeviceInput,
): Promise<ActionResult<{ id: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = deviceSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    const data = parsed.data;

    if (data.rackId && data.positionU != null) {
      const valid = await validateRackPlacement({
        organizationId,
        rackId: data.rackId,
        sizeU: data.sizeU,
        positionU: data.positionU,
      });
      if (!valid.ok) return valid;
    }

    const result = await withTenant(organizationId, async (tx) => {
      const check = await canCreateDeviceLocked(tx, organizationId);
      if (!check.ok) return { kind: "denied" as const, check };
      const device = await tx.device.create({
        data: {
          userId: session.user.id,
          organizationId,
          name: data.name,
          deviceType: data.deviceType,
          manufacturer: data.manufacturer,
          model: data.model,
          sizeU: data.sizeU,
          portCount: data.portCount,
          powerWatts: data.powerWatts ?? null,
          notes: data.notes,
          ipAddress: data.ipAddress || null,
          macAddress: data.macAddress || null,
          hostname: data.hostname || null,
          rackId: data.rackId || null,
          positionU: data.rackId ? (data.positionU ?? null) : null,
          isManual: true,
        },
        select: { id: true },
      });
      return { kind: "ok" as const, device };
    });
    if (result.kind === "denied") return tierDenial(result.check);
    const { device } = result;

    await audit({
      userId: session.user.id,
      organizationId,
      action: "created",
      entityType: "device",
      entityId: device.id,
      changes: {
        name: data.name,
        manufacturer: data.manufacturer,
        model: data.model,
      },
    });

    revalidatePath("/devices");
    revalidatePath("/dashboard");
    if (data.rackId) revalidatePath(`/racks/${data.rackId}`);
    return { ok: true, data: { id: device.id } };
  }, "Failed to create device");
}

export async function updateDevice(
  id: string,
  input: DeviceInput,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = deviceSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    const data = parsed.data;

    const existing = await withTenant(organizationId, (tx) =>
      tx.device.findFirst({
        where: { id, organizationId },
        select: { rackId: true },
      }),
    );
    if (!existing) return { ok: false, error: "Device not found" };

    if (data.rackId && data.positionU != null) {
      const valid = await validateRackPlacement({
        organizationId,
        rackId: data.rackId,
        sizeU: data.sizeU,
        positionU: data.positionU,
        excludeDeviceId: id,
      });
      if (!valid.ok) return valid;
    }

    await withTenant(organizationId, (tx) =>
      tx.device.update({
        where: { id },
        data: {
          name: data.name,
          deviceType: data.deviceType,
          manufacturer: data.manufacturer,
          model: data.model,
          sizeU: data.sizeU,
          portCount: data.portCount,
          powerWatts: data.powerWatts ?? null,
          notes: data.notes,
          ipAddress: data.ipAddress || null,
          macAddress: data.macAddress || null,
          hostname: data.hostname || null,
          rackId: data.rackId || null,
          positionU: data.rackId ? (data.positionU ?? null) : null,
        },
      }),
    );

    await audit({
      userId: session.user.id,
      organizationId,
      action: "updated",
      entityType: "device",
      entityId: id,
      changes: { name: data.name, rackId: data.rackId ?? null },
    });

    revalidatePath("/devices");
    revalidatePath(`/devices/${id}`);
    if (existing.rackId) revalidatePath(`/racks/${existing.rackId}`);
    if (data.rackId) revalidatePath(`/racks/${data.rackId}`);
    return { ok: true, data: undefined };
  }, "Failed to update device");
}

export async function deleteDevice(id: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("admin");

    const result = await withTenant(organizationId, async (tx) => {
      const device = await tx.device.findFirst({
        where: { id, organizationId },
        select: { rackId: true },
      });
      if (!device) return { kind: "not_found" as const };
      await tx.device.delete({ where: { id } });
      return { kind: "ok" as const, rackId: device.rackId };
    });

    if (result.kind === "not_found") {
      return { ok: false, error: "Device not found" };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "deleted",
      entityType: "device",
      entityId: id,
    });

    revalidatePath("/devices");
    revalidatePath("/dashboard");
    if (result.rackId) revalidatePath(`/racks/${result.rackId}`);
    return { ok: true, data: undefined };
  }, "Failed to delete device");
}

export async function createDeviceFromTemplate(
  templateId: string,
): Promise<ActionResult<{ id: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const template = getDeviceTemplate(templateId);
    if (!template) return { ok: false, error: "Unknown template" };

    const result = await withTenant(organizationId, async (tx) => {
      const check = await canCreateDeviceLocked(tx, organizationId);
      if (!check.ok) return { kind: "denied" as const, check };
      const device = await tx.device.create({
        data: {
          userId: session.user.id,
          organizationId,
          name: template.name,
          deviceType: template.deviceType,
          manufacturer: template.manufacturer,
          model: template.model,
          sizeU: template.sizeU,
          portCount: template.portCount,
          powerWatts: template.powerWatts,
          isManual: true,
        },
        select: { id: true },
      });
      return { kind: "ok" as const, device };
    });
    if (result.kind === "denied") return tierDenial(result.check);
    const { device } = result;

    await audit({
      userId: session.user.id,
      organizationId,
      action: "created",
      entityType: "device",
      entityId: device.id,
      changes: {
        name: template.name,
        deviceType: template.deviceType,
        template: template.id,
      },
    });

    revalidatePath("/devices");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: device.id } };
  }, "Failed to create device");
}

export async function importDevices(
  rows: unknown[],
): Promise<
  ActionResult<{ created: number; skipped: number; errors: string[] }>
> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, error: "No rows to import" };
    }
    if (rows.length > 1000) {
      return { ok: false, error: "Max 1000 rows per import" };
    }

    let skipped = 0;
    const errors: string[] = [];
    const toInsert: DeviceImportRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const parsed = deviceImportRowSchema.safeParse(rows[i]);
      if (!parsed.success) {
        skipped++;
        if (errors.length < 5) {
          errors.push(`Row ${i + 2}: ${handleZodError(parsed.error)}`);
        }
        continue;
      }
      toInsert.push(parsed.data);
    }

    if (toInsert.length === 0) {
      return {
        ok: false,
        error: `All ${rows.length} rows invalid. ${errors.join("; ")}`,
      };
    }

    const outcome = await withTenant(organizationId, async (tx) => {
      const check = await canCreateDeviceLocked(tx, organizationId);
      if (!check.ok) return { kind: "denied" as const, check };

      // Bulk-aware headroom check: canCreateDeviceLocked only proves we can
      // create one more, not N more. If the import would push us past the
      // cap, deny upfront with a message naming the headroom — same shape as
      // checkLimit so tierDenial() picks it up unchanged.
      if (Number.isFinite(check.limit)) {
        const headroom = check.limit - check.current;
        if (toInsert.length > headroom) {
          return {
            kind: "denied" as const,
            check: {
              ok: false as const,
              reason: `Importing ${toInsert.length} devices would exceed your ${TIER_LIMITS[check.plan].label} tier cap of ${check.limit}. You currently have ${check.current}; ${headroom} slot${headroom === 1 ? "" : "s"} available.`,
              plan: check.plan,
              current: check.current,
              limit: check.limit,
              resource: "devices" as const,
            },
          };
        }
      }

      const insertResult = await tx.device.createMany({
        data: toInsert.map((row) => ({
          userId: session.user.id,
          organizationId,
          name: row.name,
          deviceType: row.deviceType,
          manufacturer: row.manufacturer,
          model: row.model,
          sizeU: row.sizeU,
          portCount: row.portCount,
          powerWatts: row.powerWatts ?? null,
          notes: row.notes,
          ipAddress: row.ipAddress || null,
          macAddress: row.macAddress || null,
          hostname: row.hostname || null,
          isManual: true,
        })),
      });
      return { kind: "ok" as const, count: insertResult.count };
    });
    if (outcome.kind === "denied") return tierDenial(outcome.check);
    const created = outcome.count;

    await audit({
      userId: session.user.id,
      organizationId,
      action: "device_imported",
      entityType: "device",
      metadata: { created, skipped },
    });

    revalidatePath("/devices");
    revalidatePath("/dashboard");
    return { ok: true, data: { created, skipped, errors } };
  }, "Bulk insert failed");
}
