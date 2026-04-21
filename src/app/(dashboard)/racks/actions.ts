"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { canCreateRackLocked } from "@/lib/tiers";
import { getRackTemplate } from "@/lib/templates/racks";
import {
  handleZodError,
  tierDenial,
  withActionEnvelope,
} from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/action-types";
import { validateRackPlacement } from "@/lib/rack-placement";
import {
  rackSchema,
  placeDeviceSchema,
  placeCatalogDeviceSchema,
  type RackInput,
  type PlaceDeviceInput,
  type PlaceCatalogDeviceInput,
} from "@/lib/validators";

// ─── Rack CRUD ──────────────────────────────────

export async function createRack(
  input: RackInput,
): Promise<ActionResult<{ id: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = rackSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    const result = await withTenant(organizationId, async (tx) => {
      const check = await canCreateRackLocked(tx, organizationId);
      if (!check.ok) return { kind: "denied" as const, check };
      const rack = await tx.rack.create({
        data: {
          ...parsed.data,
          userId: session.user.id,
          organizationId,
        },
        select: { id: true },
      });
      return { kind: "ok" as const, rack };
    });

    if (result.kind === "denied") return tierDenial(result.check);
    const rack = result.rack;

    await audit({
      userId: session.user.id,
      organizationId,
      action: "created",
      entityType: "rack",
      entityId: rack.id,
      changes: { name: parsed.data.name, sizeU: parsed.data.sizeU },
    });

    revalidatePath("/racks");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: rack.id } };
  }, "Failed to create rack");
}

export async function updateRack(
  id: string,
  input: RackInput,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = rackSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    const result = await withTenant(organizationId, (tx) =>
      tx.rack.updateMany({
        where: { id, organizationId },
        data: parsed.data,
      }),
    );

    if (result.count === 0) {
      return { ok: false, error: "Rack not found" };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "updated",
      entityType: "rack",
      entityId: id,
      changes: parsed.data,
    });

    revalidatePath("/racks");
    revalidatePath(`/racks/${id}`);
    return { ok: true, data: undefined };
  }, "Failed to update rack");
}

export async function createRackFromTemplate(
  templateId: string,
): Promise<ActionResult<{ id: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const template = getRackTemplate(templateId);
    if (!template) return { ok: false, error: "Unknown template" };

    const result = await withTenant(organizationId, async (tx) => {
      const check = await canCreateRackLocked(tx, organizationId);
      if (!check.ok) return { kind: "denied" as const, check };
      const rack = await tx.rack.create({
        data: {
          userId: session.user.id,
          organizationId,
          name: template.name,
          sizeU: template.sizeU,
          location: template.location,
          description: template.description,
          colorTag: template.colorTag,
        },
        select: { id: true },
      });
      return { kind: "ok" as const, rack };
    });

    if (result.kind === "denied") return tierDenial(result.check);
    const rack = result.rack;

    await audit({
      userId: session.user.id,
      organizationId,
      action: "created",
      entityType: "rack",
      entityId: rack.id,
      changes: {
        name: template.name,
        sizeU: template.sizeU,
        template: template.id,
      },
    });

    revalidatePath("/racks");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: rack.id } };
  }, "Failed to create rack");
}

export async function deleteRack(id: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const result = await withTenant(organizationId, (tx) =>
      tx.rack.deleteMany({
        where: { id, organizationId },
      }),
    );

    if (result.count === 0) {
      return { ok: false, error: "Rack not found" };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "deleted",
      entityType: "rack",
      entityId: id,
    });

    revalidatePath("/racks");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  }, "Failed to delete rack");
}

// ─── Device Placement ───────────────────────────

export async function placeExistingDevice(
  input: PlaceDeviceInput,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = placeDeviceSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    const { rackId, deviceId, positionU } = parsed.data;

    const device = await withTenant(organizationId, (tx) =>
      tx.device.findFirst({
        where: { id: deviceId, organizationId },
        select: { id: true, sizeU: true },
      }),
    );

    if (!device) return { ok: false, error: "Device not found" };

    const valid = await validateRackPlacement(
      organizationId,
      rackId,
      device.sizeU,
      positionU,
      deviceId,
    );
    if (!valid.ok) return valid;

    await withTenant(organizationId, (tx) =>
      tx.device.update({
        where: { id: deviceId },
        data: { rackId, positionU },
      }),
    );

    await audit({
      userId: session.user.id,
      organizationId,
      action: "placed",
      entityType: "device",
      entityId: deviceId,
      changes: { rackId, positionU },
    });

    revalidatePath(`/racks/${rackId}`);
    revalidatePath("/devices");
    return { ok: true, data: undefined };
  }, "Failed to place device");
}

export async function placeCatalogDevice(
  input: PlaceCatalogDeviceInput,
): Promise<ActionResult<{ deviceId: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = placeCatalogDeviceSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    const { rackId, catalogId, positionU, customName } = parsed.data;

    const catalog = await prisma.deviceCatalog.findUnique({
      where: { id: catalogId },
    });

    if (!catalog) return { ok: false, error: "Catalog device not found" };

    const valid = await validateRackPlacement(
      organizationId,
      rackId,
      catalog.sizeU,
      positionU,
    );
    if (!valid.ok) return valid;

    const device = await withTenant(organizationId, (tx) =>
      tx.device.create({
        data: {
          userId: session.user.id,
          organizationId,
          rackId,
          positionU,
          name: customName || catalog.name,
          deviceType: catalog.deviceType,
          manufacturer: catalog.manufacturer,
          model: catalog.model,
          sizeU: catalog.sizeU,
          portCount: catalog.portCount,
          powerWatts: catalog.powerWatts,
        },
        select: { id: true },
      }),
    );

    await audit({
      userId: session.user.id,
      organizationId,
      action: "created",
      entityType: "device",
      entityId: device.id,
      changes: {
        name: customName || catalog.name,
        manufacturer: catalog.manufacturer,
        model: catalog.model,
        rackId,
        positionU,
      },
    });

    revalidatePath(`/racks/${rackId}`);
    revalidatePath("/devices");
    revalidatePath("/dashboard");
    return { ok: true, data: { deviceId: device.id } };
  }, "Failed to place device");
}

export async function removeDeviceFromRack(
  deviceId: string,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const result = await withTenant(organizationId, async (tx) => {
      const device = await tx.device.findFirst({
        where: { id: deviceId, organizationId },
        select: { rackId: true },
      });
      if (!device) return { kind: "not_found" as const };
      await tx.device.update({
        where: { id: deviceId },
        data: { rackId: null, positionU: null },
      });
      return { kind: "ok" as const, rackId: device.rackId };
    });

    if (result.kind === "not_found") {
      return { ok: false, error: "Device not found" };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "unplaced",
      entityType: "device",
      entityId: deviceId,
      changes: { fromRackId: result.rackId },
    });

    if (result.rackId) revalidatePath(`/racks/${result.rackId}`);
    revalidatePath("/devices");
    return { ok: true, data: undefined };
  }, "Failed to remove device");
}
