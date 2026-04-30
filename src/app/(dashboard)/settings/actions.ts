"use server";

import { headers as nextHeaders } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/prisma-tenant";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { handleZodError, withActionEnvelope } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/action-types";
import { syncSeatsForOrgStandalone } from "@/lib/stripe-seats";
import { cuidSchema } from "@/lib/validators";
import {
  PROFILE_ROLES,
  PROFILE_SCALES,
  PROFILE_USES,
  type SaveProfileInput,
} from "@/lib/profile-constants";

const saveProfileSchema = z.object({
  profileRole: z.enum(PROFILE_ROLES).nullable().optional(),
  profileScale: z.enum(PROFILE_SCALES).nullable().optional(),
  profileUse: z.enum(PROFILE_USES).nullable().optional(),
  skipped: z.boolean().default(false),
});

export async function saveProfile(
  input: SaveProfileInput,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const session = await requireUser();
    const parsed = saveProfileSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: handleZodError(parsed.error) };

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        profileRole: parsed.data.profileRole ?? null,
        profileScale: parsed.data.profileScale ?? null,
        profileUse: parsed.data.profileUse ?? null,
        profileCompletedAt: new Date(),
      },
    });

    // Read fresh from DB — the session's activeOrganizationId can lag a write
    // from /onboarding/welcome or a workspace switch.
    const userRow = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeOrganizationId: true },
    });
    const orgId = userRow?.activeOrganizationId ?? null;
    if (!orgId) return { ok: false, error: "No active organization" };

    await audit({
      userId: session.user.id,
      organizationId: orgId,
      action: parsed.data.skipped ? "profile_skipped" : "profile_saved",
      entityType: "user",
      entityId: session.user.id,
      changes: {
        profileRole: parsed.data.profileRole ?? null,
        profileScale: parsed.data.profileScale ?? null,
        profileUse: parsed.data.profileUse ?? null,
      },
    });

    revalidatePath("/dashboard", "layout");
    return { ok: true, data: undefined };
  }, "Failed to save profile");
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export async function updateProfile(
  input: z.infer<typeof profileSchema>,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const session = await requireUser();
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: handleZodError(parsed.error) };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name },
    });

    revalidatePath("/settings");
    return { ok: true, data: undefined };
  }, "Failed to update profile");
}

const preferencesSchema = z.object({
  defaultSubnet: z
    .string()
    .trim()
    .max(32)
    .regex(
      /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/,
      "Must be a CIDR like 192.168.1.0/24",
    )
    .nullable()
    .optional(),
  scanInterval: z.number().int().min(0).max(86400).nullable().optional(),
  sidebarCollapsed: z.boolean(),
});

export async function updatePreferences(
  input: z.infer<typeof preferencesSchema>,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const session = await requireUser();
    const parsed = preferencesSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: handleZodError(parsed.error) };

    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        defaultSubnet: parsed.data.defaultSubnet ?? null,
        scanInterval: parsed.data.scanInterval ?? null,
        sidebarCollapsed: parsed.data.sidebarCollapsed,
      },
      update: {
        defaultSubnet: parsed.data.defaultSubnet ?? null,
        scanInterval: parsed.data.scanInterval ?? null,
        sidebarCollapsed: parsed.data.sidebarCollapsed,
      },
    });

    revalidatePath("/settings");
    return { ok: true, data: undefined };
  }, "Failed to update preferences");
}

/**
 * Switch the user's active workspace. Validates the user is a member of the
 * target organization before flipping `User.activeOrganizationId`. The session
 * cache lags this write, but every `requireMember` reads `activeOrganizationId`
 * fresh from the DB, so subsequent navigation picks up the new value.
 */
export async function setActiveOrganization(
  organizationId: string,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const session = await requireUser();
    const idCheck = cuidSchema.safeParse(organizationId);
    if (!idCheck.success) {
      return { ok: false, error: "Invalid organization ID" };
    }

    // Membership check + user.update + audit all share one withTenant
    // transaction so the three operations are atomic (a concurrent
    // removal of the user from the org between check and write can't
    // leave `activeOrganizationId` pointing at an org they no longer
    // belong to) AND the RLS session variable is set for the AuditLog
    // write. audit() receives `tx` so it writes inside this transaction
    // instead of opening its own — errors from the audit write roll back
    // the activeOrganizationId update, which is the intended tradeoff for
    // this security-critical verb.
    //
    // NotAMemberError is thrown inside the tx to trigger rollback, then
    // caught here to render a specific user-facing message (instead of the
    // envelope's generic fallback).
    try {
      await withTenant(idCheck.data, async (tx) => {
        const member = await tx.member.findUnique({
          where: {
            userId_organizationId: {
              userId: session.user.id,
              organizationId: idCheck.data,
            },
          },
          select: { role: true },
        });
        if (!member) {
          throw new NotAMemberError();
        }

        await tx.user.update({
          where: { id: session.user.id },
          data: { activeOrganizationId: idCheck.data },
        });

        await audit({
          userId: session.user.id,
          organizationId: idCheck.data,
          action: "switched_active_organization",
          entityType: "organization",
          entityId: idCheck.data,
          tx,
        });
      });
    } catch (err) {
      if (err instanceof NotAMemberError) {
        return {
          ok: false,
          error: "You are not a member of that organization",
        };
      }
      throw err;
    }

    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  }, "Failed to switch active organization");
}

class NotAMemberError extends Error {
  constructor() {
    super("not-a-member");
    this.name = "NotAMemberError";
  }
}

// ─── Invitations: user-side accept + decline ────────────────────────────
// (Org-admin side — invite / revoke / resend — lives in organization-actions.ts.)

/**
 * Accept an invitation. Wraps BA's accept-invitation endpoint, which
 * validates that the authenticated user's email matches the invitation, then
 * creates the Member row. We additionally mirror the new active org into
 * `User.activeOrganizationId` since `requireMember` reads from there.
 */
export async function acceptInvitationAction(
  invitationId: string,
): Promise<ActionResult<{ organizationId: string }>> {
  return withActionEnvelope(async () => {
    const session = await requireUser();
    const idCheck = cuidSchema.safeParse(invitationId);
    if (!idCheck.success) return { ok: false, error: "Invalid invitation ID" };

    // Resolve the accepted org by reading the invitation row ourselves rather
    // than trusting BA's response shape. BA's return type has shifted across
    // minor releases (invitation vs member nesting); since we already own the
    // Invitation table, fetch organizationId from there after the accept
    // succeeds. Keeps this action resilient to BA upgrades.
    await auth.api.acceptInvitation({
      body: { invitationId: idCheck.data },
      headers: await nextHeaders(),
    });
    const inv = await prisma.invitation.findUnique({
      where: { id: idCheck.data },
      select: { organizationId: true },
    });
    if (!inv?.organizationId) {
      return { ok: false, error: "Could not resolve organization" };
    }
    const acceptedOrgId = inv.organizationId;

    // Mirror BA's session.activeOrganizationId update into our authoritative
    // User column so requireMember picks it up on the next request.
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeOrganizationId: acceptedOrgId },
    });

    await audit({
      userId: session.user.id,
      organizationId: acceptedOrgId,
      action: "invitation_accepted",
      entityType: "invitation",
      entityId: idCheck.data,
    });

    // Best-effort seat reconciliation. Better Auth owns the Member.create
    // tx so we can't atomically include the Stripe push; if the sync
    // fails we don't want to block the user from accepting a valid
    // invite, since the next member event (or a future reconciliation
    // job) will pick up the drift. The audit row above is the trail.
    try {
      await syncSeatsForOrgStandalone(acceptedOrgId);
    } catch (err) {
      console.error("[stripe-seats] post-accept sync failed", {
        organizationId: acceptedOrgId,
        userId: session.user.id,
        err,
      });
    }

    revalidatePath("/", "layout");
    return { ok: true, data: { organizationId: acceptedOrgId } };
  }, "Failed to accept invitation");
}

export async function declineInvitationAction(
  invitationId: string,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const session = await requireUser();
    const idCheck = cuidSchema.safeParse(invitationId);
    if (!idCheck.success) return { ok: false, error: "Invalid invitation ID" };

    // Capture orgId before BA mutates the invitation, for the audit row.
    // Both predicates (id + email-for-signed-in-user) collapse into a single
    // findFirst so the query runs in one round-trip — "invalid id" and
    // "valid id but different email" become timing-indistinguishable. Pre-
    // 10g the two-step lookup-then-compare leaked enough timing to confirm
    // whether an ID existed before the email check rejected it.
    const invite = await prisma.invitation.findFirst({
      where: {
        id: idCheck.data,
        email: { equals: session.user.email, mode: "insensitive" },
      },
      select: { organizationId: true },
    });
    if (!invite) {
      return { ok: false, error: "Invitation not found" };
    }

    await auth.api.rejectInvitation({
      body: { invitationId: idCheck.data },
      headers: await nextHeaders(),
    });

    await audit({
      userId: session.user.id,
      organizationId: invite.organizationId,
      action: "invitation_declined",
      entityType: "invitation",
      entityId: idCheck.data,
    });

    return { ok: true, data: undefined };
  }, "Failed to decline invitation");
}
