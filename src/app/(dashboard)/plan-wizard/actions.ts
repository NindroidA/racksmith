"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import {
  handleZodError,
  tierDenial,
  withActionEnvelope,
} from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/action-types";
import { canCreatePlanLocked } from "@/lib/tiers";
import {
  materializePlanInTx,
  preflightTierChecksLocked,
  recordMaterialization,
  type MaterializedIds,
} from "@/lib/plan/materialize";
import type { WizardInputs } from "@/lib/plan/wizard-types";
import {
  buildPlanCreateSchema,
  cuidSchema,
  wizardNetworkSchema,
  wizardProfileSchema,
  wizardTopologySchema,
  type BuildPlanCreateInput,
  type WizardNetworkInput,
  type WizardProfileInput,
  type WizardTopologyInput,
} from "@/lib/validators";

function validatePlanId(planId: string): ActionResult<string> {
  const parsed = cuidSchema.safeParse(planId);
  if (!parsed.success) return { ok: false, error: "Invalid plan ID" };
  return { ok: true, data: parsed.data };
}

// ─── Plan CRUD ────────────────────────────────────

export async function createBuildPlan(
  input: BuildPlanCreateInput,
): Promise<ActionResult<{ id: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");
    const parsed = buildPlanCreateSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: handleZodError(parsed.error) };

    // Advisory-locked tier check inside the transaction — serializes against
    // concurrent creates on the same (organizationId, "plans") lock. Closes
    // the TOCTOU window between the preflight count and the insert.
    const createResult = await withTenant(organizationId, async (tx) => {
      const check = await canCreatePlanLocked(tx, organizationId);
      if (!check.ok) {
        return { kind: "denied" as const, check };
      }
      const created = await tx.buildPlan.create({
        data: {
          userId: session.user.id,
          organizationId,
          name: parsed.data.name,
          status: "draft",
          inputs: {} as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      return { kind: "ok" as const, id: created.id };
    });

    if (createResult.kind === "denied") {
      return tierDenial(createResult.check);
    }
    const created = { id: createResult.id };

    await audit({
      userId: session.user.id,
      organizationId,
      action: "created",
      entityType: "build_plan",
      entityId: created.id,
      changes: { name: parsed.data.name },
    });

    revalidatePath("/plan-wizard");
    return { ok: true, data: { id: created.id } };
  }, "Failed to create plan");
}

async function loadOwnedPlan(
  planId: string,
  organizationId: string,
): Promise<{ id: string; status: string; inputs: WizardInputs } | null> {
  const row = await withTenant(organizationId, (tx) =>
    tx.buildPlan.findFirst({
      where: { id: planId, organizationId },
      select: { id: true, status: true, inputs: true },
    }),
  );
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    inputs: (row.inputs ?? {}) as WizardInputs,
  };
}

// Helper: all three step-save actions share the same auth/validate/load/merge/
// audit/revalidate flow — only the schema, step key, and audit extras differ.
// Kept internal (not exported) so it stays a plain helper, not a server action.
type StepKey = "profile" | "topology" | "network";

async function saveWizardStep<Parsed>(
  planId: string,
  stepKey: StepKey,
  parsed:
    | { success: true; data: Parsed }
    | { success: false; error: z.ZodError },
  auditExtras: (data: Parsed) => Record<string, unknown>,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");
    const idCheck = validatePlanId(planId);
    if (!idCheck.ok) return idCheck;

    if (!parsed.success)
      return { ok: false, error: handleZodError(parsed.error) };

    const plan = await loadOwnedPlan(idCheck.data, organizationId);
    if (!plan) return { ok: false, error: "Plan not found" };
    if (plan.status !== "draft")
      return { ok: false, error: "Cannot edit an applied or discarded plan" };

    const merged: WizardInputs = {
      ...plan.inputs,
      [stepKey]: parsed.data,
    } as WizardInputs;
    await withTenant(organizationId, (tx) =>
      tx.buildPlan.update({
        where: { id: plan.id },
        data: { inputs: merged as Prisma.InputJsonValue },
      }),
    );

    await audit({
      userId: session.user.id,
      organizationId,
      action: "updated",
      entityType: "build_plan",
      entityId: plan.id,
      changes: { step: stepKey, ...auditExtras(parsed.data) },
    });

    revalidatePath(`/plan-wizard/${plan.id}`);
    return { ok: true, data: undefined };
  }, `Failed to save ${stepKey} step`);
}

export async function saveProfileStep(
  planId: string,
  input: WizardProfileInput,
): Promise<ActionResult> {
  return saveWizardStep(
    planId,
    "profile",
    wizardProfileSchema.safeParse(input),
    () => ({}),
  );
}

export async function saveTopologyStep(
  planId: string,
  input: WizardTopologyInput,
): Promise<ActionResult> {
  return saveWizardStep(
    planId,
    "topology",
    wizardTopologySchema.safeParse(input),
    (data) => ({ deviceCount: data.selected.length }),
  );
}

export async function saveNetworkStep(
  planId: string,
  input: WizardNetworkInput,
): Promise<ActionResult> {
  return saveWizardStep(
    planId,
    "network",
    wizardNetworkSchema.safeParse(input),
    (data) => ({ vlanCount: data.vlans.length }),
  );
}

/**
 * Apply a draft plan. Runs status-flip + materialization in a single
 * `$transaction` so a concurrent caller (or a retry after a transient
 * Prisma error) cannot create duplicate racks/devices/VLANs/subnets:
 *
 * 1. `updateMany` claims the plan atomically (only one caller can flip
 *    `draft → applied`; concurrent callers see `count === 0`).
 * 2. `materializePlanInTx` runs in the same transaction; any throw rolls
 *    back BOTH the status flip and the resource inserts.
 * 3. Audit + cache invalidation runs only after the transaction commits.
 */
export async function applyBuildPlan(
  planId: string,
): Promise<
  ActionResult<{ rackId: string; deviceCount: number; vlanCount: number }>
> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");
    const idCheck = validatePlanId(planId);
    if (!idCheck.ok) return idCheck;

    const plan = await loadOwnedPlan(idCheck.data, organizationId);
    if (!plan) return { ok: false, error: "Plan not found" };
    if (plan.status === "applied")
      return { ok: false, error: "Plan was already applied" };
    if (plan.status === "discarded")
      return { ok: false, error: "Cannot apply a discarded plan" };

    // Tier preflight + materialization run in a single transaction with
    // advisory locks held on every resource category. Closes the TOCTOU
    // window where a concurrent action could push the org over a cap between
    // preflight and the insert.
    type ApplyResult =
      | { kind: "ok"; ids: MaterializedIds }
      | { kind: "denied"; error: string };

    const result: ApplyResult = await withTenant(organizationId, async (tx) => {
      const preflight = await preflightTierChecksLocked(
        tx,
        organizationId,
        plan.inputs,
      );
      if (!preflight.ok) {
        return { kind: "denied" as const, error: preflight.error };
      }

      const claim = await tx.buildPlan.updateMany({
        where: {
          id: plan.id,
          organizationId,
          status: "draft",
        },
        data: { status: "applied", appliedAt: new Date() },
      });
      if (claim.count === 0) {
        throw new Error(
          "Plan was modified by another action — please refresh.",
        );
      }
      const ids = await materializePlanInTx(
        tx,
        session.user.id,
        organizationId,
        plan.inputs,
      );
      return { kind: "ok" as const, ids };
    });

    if (result.kind === "denied") {
      return { ok: false, error: result.error };
    }
    const ids = result.ids;

    await Promise.all([
      withTenant(organizationId, () =>
        recordMaterialization(session.user.id, organizationId, ids),
      ),
      audit({
        userId: session.user.id,
        organizationId,
        action: "applied",
        entityType: "build_plan",
        entityId: plan.id,
        changes: {
          rackId: ids.rackId,
          deviceCount: ids.deviceIds.length,
          vlanCount: ids.vlanIds.length,
        },
      }),
    ]);

    revalidatePath("/plan-wizard");
    revalidatePath("/dashboard");
    revalidatePath("/racks");
    revalidatePath("/devices");
    revalidatePath("/network-tools/vlans");
    revalidatePath("/ipam");

    return {
      ok: true,
      data: {
        rackId: ids.rackId,
        deviceCount: ids.deviceIds.length,
        vlanCount: ids.vlanIds.length,
      },
    };
  }, "Failed to apply plan");
}

export async function discardBuildPlan(planId: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");
    const idCheck = validatePlanId(planId);
    if (!idCheck.ok) return idCheck;

    const result = await withTenant(organizationId, (tx) =>
      tx.buildPlan.updateMany({
        where: { id: idCheck.data, organizationId, status: "draft" },
        data: { status: "discarded" },
      }),
    );
    if (result.count === 0)
      return { ok: false, error: "Plan not found or already finalized" };

    await audit({
      userId: session.user.id,
      organizationId,
      action: "discarded",
      entityType: "build_plan",
      entityId: idCheck.data,
    });

    revalidatePath("/plan-wizard");
    return { ok: true, data: undefined };
  }, "Failed to discard plan");
}

export async function deleteBuildPlan(planId: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    // Destructive delete of a tenant-scoped row → admin rank (CLAUDE.md
    // destructive-operation policy; BuildPlan is not a carve-out).
    const { session, organizationId } = await requireMember("admin");
    const idCheck = validatePlanId(planId);
    if (!idCheck.ok) return idCheck;

    const result = await withTenant(organizationId, (tx) =>
      tx.buildPlan.deleteMany({
        where: { id: idCheck.data, organizationId },
      }),
    );
    if (result.count === 0) return { ok: false, error: "Plan not found" };

    await audit({
      userId: session.user.id,
      organizationId,
      action: "deleted",
      entityType: "build_plan",
      entityId: idCheck.data,
    });

    revalidatePath("/plan-wizard");
    return { ok: true, data: undefined };
  }, "Failed to delete plan");
}
