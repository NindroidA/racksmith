"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import {
  handleZodError,
  tierDenial,
  withActionEnvelope,
} from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/action-types";
import { canCreateVlanLocked } from "@/lib/tiers";
import { getVlanTemplate } from "@/lib/config-gen/templates";
import {
  vlanSchema,
  vlanAssignmentSchema,
  type VlanInput,
  type VlanAssignmentInput,
} from "@/lib/validators";

// ─── VLAN CRUD ────────────────────────────────────

export async function createVlan(
  input: VlanInput,
): Promise<ActionResult<{ id: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = vlanSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    const result = await withTenant(organizationId, async (tx) => {
      const check = await canCreateVlanLocked(tx, organizationId);
      if (!check.ok) return { kind: "denied" as const, check };

      const duplicate = await tx.vlan.findUnique({
        where: {
          organizationId_vlanId: {
            organizationId,
            vlanId: parsed.data.vlanId,
          },
        },
        select: { id: true, name: true },
      });
      if (duplicate) {
        return { kind: "duplicate" as const, name: duplicate.name };
      }

      const vlan = await tx.vlan.create({
        data: {
          userId: session.user.id,
          organizationId,
          vlanId: parsed.data.vlanId,
          name: parsed.data.name,
          description: parsed.data.description,
          colorTag: parsed.data.colorTag,
          purpose: parsed.data.purpose,
        },
        select: { id: true },
      });

      return { kind: "ok" as const, vlan };
    });

    if (result.kind === "denied") return tierDenial(result.check);
    if (result.kind === "duplicate") {
      return {
        ok: false,
        error: `VLAN ${parsed.data.vlanId} already exists (${result.name})`,
      };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "created",
      entityType: "vlan",
      entityId: result.vlan.id,
      changes: {
        vlanId: parsed.data.vlanId,
        name: parsed.data.name,
        purpose: parsed.data.purpose,
      },
    });

    revalidatePath("/network-tools/vlans");
    return { ok: true, data: { id: result.vlan.id } };
  }, "Failed to create VLAN");
}

export async function updateVlan(
  id: string,
  input: VlanInput,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = vlanSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    const result = await withTenant(organizationId, async (tx) => {
      const conflict = await tx.vlan.findFirst({
        where: {
          organizationId,
          vlanId: parsed.data.vlanId,
          NOT: { id },
        },
        select: { name: true },
      });
      if (conflict) {
        return { kind: "conflict" as const, name: conflict.name };
      }

      const updated = await tx.vlan.updateMany({
        where: { id, organizationId },
        data: {
          vlanId: parsed.data.vlanId,
          name: parsed.data.name,
          description: parsed.data.description,
          colorTag: parsed.data.colorTag,
          purpose: parsed.data.purpose,
        },
      });

      return { kind: "ok" as const, count: updated.count };
    });

    if (result.kind === "conflict") {
      return {
        ok: false,
        error: `VLAN ID ${parsed.data.vlanId} is already in use (${result.name})`,
      };
    }
    if (result.count === 0) return { ok: false, error: "VLAN not found" };

    await audit({
      userId: session.user.id,
      organizationId,
      action: "updated",
      entityType: "vlan",
      entityId: id,
      changes: {
        vlanId: parsed.data.vlanId,
        name: parsed.data.name,
      },
    });

    revalidatePath("/network-tools/vlans");
    revalidatePath(`/network-tools/vlans/${id}`);
    return { ok: true, data: undefined };
  }, "Failed to update VLAN");
}

export async function deleteVlan(id: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const count = await withTenant(organizationId, async (tx) => {
      const result = await tx.vlan.deleteMany({
        where: { id, organizationId },
      });
      return result.count;
    });
    if (count === 0) return { ok: false, error: "VLAN not found" };

    await audit({
      userId: session.user.id,
      organizationId,
      action: "deleted",
      entityType: "vlan",
      entityId: id,
    });

    revalidatePath("/network-tools/vlans");
    return { ok: true, data: undefined };
  }, "Failed to delete VLAN");
}

// ─── VLAN Assignment CRUD ─────────────────────────

export async function assignVlanToDevice(
  input: VlanAssignmentInput,
): Promise<ActionResult<{ id: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = vlanAssignmentSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    let result;
    try {
      result = await withTenant(organizationId, async (tx) => {
        const [vlan, device] = await Promise.all([
          tx.vlan.findFirst({
            where: { id: parsed.data.vlanId, organizationId },
            select: { id: true, vlanId: true, name: true },
          }),
          tx.device.findFirst({
            where: { id: parsed.data.deviceId, organizationId },
            select: { id: true, name: true },
          }),
        ]);

        if (!vlan) return { kind: "vlan_notfound" as const };
        if (!device) return { kind: "device_notfound" as const };

        const assignment = await tx.vlanAssignment.create({
          data: {
            userId: session.user.id,
            organizationId,
            vlanId: vlan.id,
            deviceId: device.id,
            mode: parsed.data.mode,
            portNumber: parsed.data.portNumber ?? null,
            tagged: parsed.data.tagged,
          },
          select: { id: true },
        });

        return { kind: "ok" as const, vlan, device, assignment };
      });
    } catch (err) {
      // Unique-constraint violation on (vlanId, deviceId, portNumber) surfaces
      // as Prisma P2002 — translate to a friendly message here so the generic
      // envelope doesn't swallow it as a 500.
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: unknown }).code === "P2002"
      ) {
        return {
          ok: false,
          error: "This VLAN is already assigned to that device/port.",
        };
      }
      throw err;
    }

    if (result.kind === "vlan_notfound") {
      return { ok: false, error: "VLAN not found" };
    }
    if (result.kind === "device_notfound") {
      return { ok: false, error: "Device not found" };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "created",
      entityType: "vlan_assignment",
      entityId: result.assignment.id,
      changes: {
        vlanId: result.vlan.vlanId,
        deviceId: result.device.id,
        mode: parsed.data.mode,
      },
    });

    revalidatePath("/network-tools/vlans");
    return { ok: true, data: { id: result.assignment.id } };
  }, "Failed to assign VLAN");
}

export async function removeVlanAssignment(id: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const result = await withTenant(organizationId, async (tx) => {
      const existing = await tx.vlanAssignment.findFirst({
        where: { id, organizationId },
        select: { vlanId: true },
      });
      if (!existing) return { kind: "notfound" as const };

      await tx.vlanAssignment.delete({ where: { id } });
      return { kind: "ok" as const };
    });

    if (result.kind === "notfound") {
      return { ok: false, error: "Assignment not found" };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "deleted",
      entityType: "vlan_assignment",
      entityId: id,
    });

    revalidatePath("/network-tools/vlans");
    return { ok: true, data: undefined };
  }, "Failed to remove assignment");
}

// ─── VLAN Template apply ──────────────────────────

export async function applyVlanTemplate(templateId: string): Promise<
  ActionResult<{
    created: number;
    skipped: Array<{ vlanId: number; reason: string }>;
  }>
> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const template = getVlanTemplate(templateId);
    if (!template) return { ok: false, error: "Unknown template" };

    const outcome = await withTenant(organizationId, async (tx) => {
      const existing = await tx.vlan.findMany({
        where: { organizationId },
        select: { vlanId: true },
      });
      const takenIds = new Set(existing.map((v) => v.vlanId));

      const tierCheck = await canCreateVlanLocked(tx, organizationId);
      if (!tierCheck.ok) return { kind: "denied" as const, check: tierCheck };

      const remainingSlots = Number.isFinite(tierCheck.limit)
        ? tierCheck.limit - tierCheck.current
        : template.entries.length;
      const slotsAvailable = Math.min(remainingSlots, template.entries.length);

      const skipped: Array<{ vlanId: number; reason: string }> = [];
      const createdRows: Array<{ id: string; vlanId: number; name: string }> =
        [];
      let created = 0;

      for (const entry of template.entries) {
        if (takenIds.has(entry.vlanId)) {
          skipped.push({ vlanId: entry.vlanId, reason: "already exists" });
          continue;
        }
        if (created >= slotsAvailable) {
          skipped.push({ vlanId: entry.vlanId, reason: "tier limit" });
          continue;
        }

        try {
          const row = await tx.vlan.create({
            data: {
              userId: session.user.id,
              organizationId,
              vlanId: entry.vlanId,
              name: entry.name,
              description: entry.description,
              colorTag: entry.colorTag,
              purpose: entry.purpose,
            },
            select: { id: true },
          });
          createdRows.push({
            id: row.id,
            vlanId: entry.vlanId,
            name: entry.name,
          });
          created++;
        } catch (err) {
          skipped.push({
            vlanId: entry.vlanId,
            reason: err instanceof Error ? err.message : "create failed",
          });
        }
      }

      return { kind: "ok" as const, created, skipped, createdRows };
    });

    if (outcome.kind === "denied") return tierDenial(outcome.check);

    for (const row of outcome.createdRows) {
      await audit({
        userId: session.user.id,
        organizationId,
        action: "created",
        entityType: "vlan",
        entityId: row.id,
        changes: {
          vlanId: row.vlanId,
          name: row.name,
          template: template.id,
        },
      });
    }

    revalidatePath("/network-tools/vlans");
    return {
      ok: true,
      data: { created: outcome.created, skipped: outcome.skipped },
    };
  }, "Failed to apply VLAN template");
}

// ─── Subnet ↔ VLAN link ───────────────────────────

export async function linkSubnetToVlan(
  subnetId: string,
  vlanId: string | null,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const result = await withTenant(organizationId, async (tx) => {
      if (vlanId !== null) {
        const vlan = await tx.vlan.findFirst({
          where: { id: vlanId, organizationId },
          select: { id: true },
        });
        if (!vlan) return { kind: "vlan_notfound" as const };
      }

      const updated = await tx.subnet.updateMany({
        where: { id: subnetId, organizationId },
        data: { vlanId },
      });

      return { kind: "ok" as const, count: updated.count };
    });

    if (result.kind === "vlan_notfound") {
      return { ok: false, error: "VLAN not found" };
    }
    if (result.count === 0) return { ok: false, error: "Subnet not found" };

    await audit({
      userId: session.user.id,
      organizationId,
      action: "updated",
      entityType: "subnet",
      entityId: subnetId,
      changes: { vlanId },
    });

    revalidatePath("/network-tools/vlans");
    revalidatePath(`/ipam/${subnetId}`);
    return { ok: true, data: undefined };
  }, "Failed to link subnet");
}
