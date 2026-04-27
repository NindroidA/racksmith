"use server";

import { headers as nextHeaders } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import {
  organizationInviteEmail,
  ownershipTransferEmail,
} from "@/lib/email-templates";
import { requireMember, requireUser } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import {
  describeError,
  handleZodError,
  withActionEnvelope,
} from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/action-types";
import { cuidSchema } from "@/lib/validators";
import { ASSIGNABLE_ROLES, isRole } from "@/lib/permissions";
import { validateSlug } from "@/lib/slug";
import { writeOrganizationSnapshot } from "@/lib/organization-export";
import { OWNERSHIP_TRANSFER_TTL_MS } from "@/lib/ownership-transfer-constants";
import { revokeKeysCreatedByUser } from "@/lib/api/key-lifecycle";

const BASE_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

// ─── Organization management (Settings → Organization tab) ──────────────

const orgNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be 80 characters or fewer"),
});

export async function renameOrganization(
  input: z.infer<typeof orgNameSchema>,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("admin");
    const parsed = orgNameSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: handleZodError(parsed.error) };

    await prisma.organization.update({
      where: { id: organizationId },
      data: { name: parsed.data.name },
    });

    await audit({
      userId: session.user.id,
      organizationId,
      action: "updated",
      entityType: "organization",
      entityId: organizationId,
      changes: { name: parsed.data.name },
    });

    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  }, "Failed to rename organization");
}

const orgSlugSchema = z.object({ slug: z.string().trim().min(2).max(63) });

export async function updateOrganizationSlug(
  input: z.infer<typeof orgSlugSchema>,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("admin");
    const parsed = orgSlugSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: handleZodError(parsed.error) };

    const slugError = validateSlug(parsed.data.slug);
    if (slugError) return { ok: false, error: slugError };

    // Reject collision via the unique index — Prisma throws P2002 here, but
    // explicit pre-check gives a friendlier error for the common case.
    const collision = await prisma.organization.findFirst({
      where: { slug: parsed.data.slug, NOT: { id: organizationId } },
      select: { id: true },
    });
    if (collision) {
      return { ok: false, error: "That slug is already taken" };
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: { slug: parsed.data.slug },
    });

    await audit({
      userId: session.user.id,
      organizationId,
      action: "updated",
      entityType: "organization",
      entityId: organizationId,
      changes: { slug: parsed.data.slug },
    });

    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  }, "Failed to update organization slug");
}

const memberRoleSchema = z.object({
  memberId: cuidSchema,
  role: z.string().refine((v) => isRole(v) && v !== "owner", {
    message: "Role must be admin, member, or viewer",
  }),
});

export async function updateMemberRole(
  input: z.infer<typeof memberRoleSchema>,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("admin");
    const parsed = memberRoleSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: handleZodError(parsed.error) };

    const target = await prisma.member.findFirst({
      where: { id: parsed.data.memberId, organizationId },
      select: { id: true, role: true, userId: true },
    });
    if (!target) return { ok: false, error: "Member not found" };
    if (target.role === "owner") {
      return {
        ok: false,
        error: "Use the transfer-ownership flow to change the owner",
      };
    }
    if (target.userId === session.user.id) {
      return { ok: false, error: "You cannot change your own role" };
    }

    await prisma.member.update({
      where: { id: parsed.data.memberId },
      // parsed.data.role is already AssignableRole (Zod-validated) — strict
      // subset of Role, so no cast needed when writing to the string column.
      data: { role: parsed.data.role },
    });

    await audit({
      userId: session.user.id,
      organizationId,
      action: "member_role_changed",
      entityType: "member",
      entityId: parsed.data.memberId,
      changes: { role: parsed.data.role, previousRole: target.role },
    });

    revalidatePath("/settings");
    return { ok: true, data: undefined };
  }, "Failed to update member role");
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("admin");
    const idCheck = cuidSchema.safeParse(memberId);
    if (!idCheck.success) return { ok: false, error: "Invalid member ID" };

    const target = await prisma.member.findFirst({
      where: { id: idCheck.data, organizationId },
      select: { id: true, role: true, userId: true },
    });
    if (!target) return { ok: false, error: "Member not found" };
    if (target.role === "owner") {
      return { ok: false, error: "Cannot remove the organization owner" };
    }
    if (target.userId === session.user.id) {
      return {
        ok: false,
        error: "Use leave organization instead of removing yourself",
      };
    }

    // Atomic: delete the membership, clear the target's activeOrganizationId,
    // and revoke any API keys the departing member created — all in one
    // transaction. A partial failure would strand the user pointing at an
    // org they can no longer access (defensively handled by `requireMember`)
    // OR leave their API keys live after they lost access, which IS a
    // security issue. Both invariants ride on the same tx boundary.
    const revokedKeyIds = await prisma.$transaction(async (tx) => {
      await tx.member.delete({ where: { id: idCheck.data } });
      await tx.user.updateMany({
        where: { id: target.userId, activeOrganizationId: organizationId },
        data: { activeOrganizationId: null },
      });
      return revokeKeysCreatedByUser(tx, organizationId, target.userId);
    });

    await audit({
      userId: session.user.id,
      organizationId,
      action: "member_removed",
      entityType: "member",
      entityId: target.id,
      changes: { removedUserId: target.userId, role: target.role },
    });

    // Per-key audit rows emitted after the tx commits: `audit()` opens its
    // own `withTenant` transaction internally, so nesting here would fight
    // over the same connection.
    for (const keyId of revokedKeyIds) {
      await audit({
        userId: session.user.id,
        organizationId,
        action: "api_key_auto_revoked",
        entityType: "api_key",
        entityId: keyId,
        changes: {
          reason: "member_removed",
          removedUserId: target.userId,
        },
      });
    }

    revalidatePath("/settings");
    return { ok: true, data: undefined };
  }, "Failed to remove member");
}

const deleteOrgSchema = z.object({
  confirmName: z.string().min(1, "Type the organization name to confirm"),
});

export async function deleteOrganization(
  input: z.infer<typeof deleteOrgSchema>,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("owner");
    const parsed = deleteOrgSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: handleZodError(parsed.error) };

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    if (!org) return { ok: false, error: "Organization not found" };
    if (parsed.data.confirmName.trim() !== org.name) {
      return { ok: false, error: "Confirmation does not match the org name" };
    }

    // Pre-delete safety net: dump the entire org as JSON to the backup dir
    // before the cascade fires. Per handoff §13b — 90% of recovery safety
    // for 10% of the schema cost. If the export fails, we abort the delete
    // (better to leave the org standing than to lose it without a backup).
    // Keep this try/catch: on backup failure we must return a specific
    // user-facing message that reassures the data is intact, not the
    // generic envelope fallback.
    let exportPath: string;
    let exportBytes: number;
    try {
      const written = await writeOrganizationSnapshot(organizationId);
      exportPath = written.path;
      exportBytes = written.bytes;
    } catch (err) {
      return {
        ok: false,
        error: `Pre-delete backup failed (${describeError(err, "unknown error")}). Delete aborted — your data is intact.`,
      };
    }

    // Emit a structured log BEFORE delete — the DB audit row would cascade away
    // with the org (AuditLog.organizationId has ON DELETE CASCADE), so the
    // backup trail must live outside the tenant's row graph. The log line is
    // persisted by the deployment host alongside other application logs.
    console.warn(
      `[organization.deleted] path=${exportPath} bytes=${exportBytes} orgId=${organizationId} userId=${session.user.id} name=${JSON.stringify(org.name)}`,
    );

    // Best-effort DB audit too — will be cascaded, but useful for the short
    // window between this write and the delete in case anyone reads the log
    // live (e.g. dashboard recent activity).
    await audit({
      userId: session.user.id,
      organizationId,
      action: "deleted",
      entityType: "organization",
      entityId: organizationId,
      changes: {
        name: org.name,
        backupPath: exportPath,
        backupBytes: exportBytes,
      },
    });

    await prisma.organization.delete({ where: { id: organizationId } });

    // Reset the deleting user's active org so their next page hit goes through
    // /onboarding/welcome to pick another workspace.
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeOrganizationId: null },
    });

    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  }, "Failed to delete organization");
}

// ─── Invitations (BA-managed token + status; we call its endpoints) ─────

const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(254),
  role: z.enum(ASSIGNABLE_ROLES),
});

export async function inviteMember(
  input: z.infer<typeof inviteMemberSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("admin");
    const parsed = inviteMemberSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: handleZodError(parsed.error) };

    // Reject re-inviting an existing member up front — friendlier than waiting
    // for BA to throw, and avoids the user wondering why no email arrived.
    // Case-insensitive match: emails normalized to lowercase at invite time
    // but the User row could be from older code paths (e.g. OAuth) that kept
    // the original casing.
    const existingMember = await prisma.member.findFirst({
      where: {
        organizationId,
        user: { email: { equals: parsed.data.email, mode: "insensitive" } },
      },
      select: { id: true },
    });
    if (existingMember) {
      return { ok: false, error: "That person is already a member" };
    }

    const result = await auth.api.createInvitation({
      body: {
        email: parsed.data.email,
        role: parsed.data.role,
        organizationId,
        resend: true,
      },
      headers: await nextHeaders(),
    });
    const invitationId = (result as { id?: string }).id ?? "";
    if (!invitationId) {
      return { ok: false, error: "Failed to create invitation" };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "member_invited",
      entityType: "invitation",
      entityId: invitationId,
      changes: { email: parsed.data.email, role: parsed.data.role },
    });

    revalidatePath("/settings");
    return { ok: true, data: { id: invitationId } };
  }, "Failed to invite member");
}

export async function revokeInvitation(
  invitationId: string,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("admin");
    const idCheck = cuidSchema.safeParse(invitationId);
    if (!idCheck.success) return { ok: false, error: "Invalid invitation ID" };

    // Belt-and-suspenders: confirm this invite belongs to the active org
    // before BA's permission check fires.
    const invite = await prisma.invitation.findFirst({
      where: { id: idCheck.data, organizationId },
      select: { id: true, email: true, status: true },
    });
    if (!invite) return { ok: false, error: "Invitation not found" };
    if (invite.status !== "pending") {
      return {
        ok: false,
        error: `Invitation is ${invite.status}, not pending`,
      };
    }

    await auth.api.cancelInvitation({
      body: { invitationId: idCheck.data },
      headers: await nextHeaders(),
    });

    await audit({
      userId: session.user.id,
      organizationId,
      action: "invitation_revoked",
      entityType: "invitation",
      entityId: idCheck.data,
      changes: { email: invite.email },
    });

    revalidatePath("/settings");
    return { ok: true, data: undefined };
  }, "Failed to revoke invitation");
}

/**
 * Resend an invitation email without rotating the token. The invitation row
 * stays put — only the email goes out again. Useful when the original got
 * caught in a spam filter.
 */
export async function resendInvitation(
  invitationId: string,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("admin");
    const idCheck = cuidSchema.safeParse(invitationId);
    if (!idCheck.success) return { ok: false, error: "Invalid invitation ID" };

    const invite = await prisma.invitation.findFirst({
      where: { id: idCheck.data, organizationId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        organization: { select: { name: true } },
        inviter: { select: { name: true, email: true } },
      },
    });
    if (!invite) return { ok: false, error: "Invitation not found" };
    if (invite.status !== "pending") {
      return {
        ok: false,
        error: `Invitation is ${invite.status}, not pending`,
      };
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      return {
        ok: false,
        error: "This invitation expired — revoke it and send a fresh one",
      };
    }

    const tpl = organizationInviteEmail({
      organizationName: invite.organization.name,
      inviterName: invite.inviter.name || "A teammate",
      role: invite.role,
      acceptUrl: `${BASE_URL}/invite/${invite.id}`,
    });

    await sendEmail({ to: invite.email, ...tpl });

    await audit({
      userId: session.user.id,
      organizationId,
      action: "invitation_resent",
      entityType: "invitation",
      entityId: invite.id,
      changes: { email: invite.email, role: invite.role },
    });

    return { ok: true, data: undefined };
  }, "Failed to resend invitation");
}

// ─── Owner transfer (3-day TTL, email-confirmed handoff) ────────────────

const OWNERSHIP_TRANSFER_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const OWNERSHIP_TRANSFER_RATE_MAX = 5;

export async function requestOwnershipTransfer(
  memberId: string,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("owner");
    const idCheck = cuidSchema.safeParse(memberId);
    if (!idCheck.success) return { ok: false, error: "Invalid member ID" };

    // Rate limit: at most 5 transfer requests per owner per hour. Gating on
    // `fromUserId` rather than organization so a compromised owner can't use
    // this as an email-harassment channel by cycling targets.
    const recentCount = await prisma.ownershipTransfer.count({
      where: {
        fromUserId: session.user.id,
        createdAt: {
          gt: new Date(Date.now() - OWNERSHIP_TRANSFER_RATE_WINDOW_MS),
        },
      },
    });
    if (recentCount >= OWNERSHIP_TRANSFER_RATE_MAX) {
      return {
        ok: false,
        error: "Too many transfer attempts. Wait an hour and try again.",
      };
    }

    const target = await prisma.member.findFirst({
      where: { id: idCheck.data, organizationId },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!target) return { ok: false, error: "Member not found" };
    if (target.user.id === session.user.id) {
      return { ok: false, error: "You already own this organization" };
    }
    if (target.role === "owner") {
      return { ok: false, error: "That member is already the owner" };
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    if (!org) return { ok: false, error: "Organization not found" };

    // Revoke prior pending transfer + create the new one in a single tx —
    // the new row's id feeds into the email URL below. Keeping both writes
    // atomic prevents a window where two pending transfers exist.
    const [, transfer] = await prisma.$transaction([
      prisma.ownershipTransfer.updateMany({
        where: { organizationId, status: "pending" },
        data: { status: "revoked", revokedAt: new Date() },
      }),
      prisma.ownershipTransfer.create({
        data: {
          organizationId,
          fromUserId: session.user.id,
          toUserId: target.user.id,
          expiresAt: new Date(Date.now() + OWNERSHIP_TRANSFER_TTL_MS),
        },
        select: { id: true },
      }),
    ]);

    const tpl = ownershipTransferEmail({
      organizationName: org.name,
      initiatorName: session.user.name || "An owner",
      confirmUrl: `${BASE_URL}/ownership-transfer/${transfer.id}`,
    });

    try {
      await sendEmail({ to: target.user.email, ...tpl });
    } catch (err) {
      // Email failed — mark the transfer "revoked" with a stage tag so the
      // trail survives. Don't delete (preserves audit + rate-count integrity).
      await prisma.ownershipTransfer.update({
        where: { id: transfer.id },
        data: { status: "revoked", revokedAt: new Date() },
      });
      await audit({
        userId: session.user.id,
        organizationId,
        action: "ownership_transfer_revoked",
        entityType: "organization",
        entityId: organizationId,
        changes: {
          reason: "email_failed",
          transferId: transfer.id,
          toUserId: target.user.id,
        },
      });
      return { ok: false, error: describeError(err, "Failed to send email") };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "ownership_transfer_requested",
      entityType: "organization",
      entityId: organizationId,
      changes: {
        transferId: transfer.id,
        toUserId: target.user.id,
      },
    });

    revalidatePath("/settings");
    return { ok: true, data: undefined };
  }, "Failed to request ownership transfer");
}

export async function confirmOwnershipTransfer(
  transferId: string,
): Promise<ActionResult<{ organizationId: string }>> {
  return withActionEnvelope(async () => {
    const session = await requireUser();
    const idCheck = cuidSchema.safeParse(transferId);
    if (!idCheck.success) return { ok: false, error: "Invalid transfer ID" };

    const transfer = await prisma.ownershipTransfer.findUnique({
      where: { id: idCheck.data },
      select: {
        id: true,
        organizationId: true,
        fromUserId: true,
        toUserId: true,
        status: true,
        expiresAt: true,
      },
    });
    if (!transfer) return { ok: false, error: "Transfer not found" };
    if (transfer.toUserId !== session.user.id) {
      return { ok: false, error: "This transfer is for a different user" };
    }
    if (transfer.status !== "pending") {
      return {
        ok: false,
        error: `Transfer is ${transfer.status}, not pending`,
      };
    }
    if (transfer.expiresAt.getTime() < Date.now()) {
      await prisma.ownershipTransfer.update({
        where: { id: transfer.id },
        data: { status: "expired" },
      });
      return {
        ok: false,
        error: "This transfer expired — ask for a fresh one",
      };
    }

    // Swap inside a single transaction so the member lookups, the role guard,
    // and the three writes all observe the same snapshot. Without this, the
    // initiator could lose `owner` role between the guard and the swap,
    // leaving the org with two owners (or none) depending on which write
    // lost the race.
    const outcome = await prisma.$transaction(async (tx) => {
      const [fromMember, toMember] = await Promise.all([
        tx.member.findUnique({
          where: {
            userId_organizationId: {
              userId: transfer.fromUserId,
              organizationId: transfer.organizationId,
            },
          },
          select: { id: true, role: true },
        }),
        tx.member.findUnique({
          where: {
            userId_organizationId: {
              userId: transfer.toUserId,
              organizationId: transfer.organizationId,
            },
          },
          select: { id: true, role: true },
        }),
      ]);
      if (!fromMember || !toMember) {
        return {
          ok: false as const,
          revoke: true,
          error: "One of the parties is no longer a member",
        };
      }
      if (fromMember.role !== "owner") {
        return {
          ok: false as const,
          revoke: true,
          error: "Initiator is no longer the owner — transfer canceled",
        };
      }

      await tx.member.update({
        where: { id: toMember.id },
        data: { role: "owner" },
      });
      await tx.member.update({
        where: { id: fromMember.id },
        data: { role: "admin" },
      });
      await tx.ownershipTransfer.update({
        where: { id: transfer.id },
        data: { status: "accepted", acceptedAt: new Date() },
      });
      return { ok: true as const };
    });

    if (!outcome.ok) {
      if (outcome.revoke) {
        await prisma.ownershipTransfer.update({
          where: { id: transfer.id },
          data: { status: "revoked", revokedAt: new Date() },
        });
      }
      return { ok: false, error: outcome.error };
    }

    await audit({
      userId: session.user.id,
      organizationId: transfer.organizationId,
      action: "ownership_transfer_accepted",
      entityType: "organization",
      entityId: transfer.organizationId,
      changes: {
        transferId: transfer.id,
        fromUserId: transfer.fromUserId,
        toUserId: transfer.toUserId,
      },
    });

    revalidatePath("/", "layout");
    return { ok: true, data: { organizationId: transfer.organizationId } };
  }, "Failed to confirm ownership transfer");
}

export async function revokeOwnershipTransfer(
  transferId: string,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("owner");
    const idCheck = cuidSchema.safeParse(transferId);
    if (!idCheck.success) return { ok: false, error: "Invalid transfer ID" };

    const transfer = await prisma.ownershipTransfer.findFirst({
      where: { id: idCheck.data, organizationId, status: "pending" },
      select: { id: true, toUserId: true },
    });
    if (!transfer) {
      return { ok: false, error: "No pending transfer with that ID" };
    }

    await prisma.ownershipTransfer.update({
      where: { id: transfer.id },
      data: { status: "revoked", revokedAt: new Date() },
    });

    await audit({
      userId: session.user.id,
      organizationId,
      action: "ownership_transfer_revoked",
      entityType: "organization",
      entityId: organizationId,
      changes: {
        transferId: transfer.id,
        toUserId: transfer.toUserId,
      },
    });

    revalidatePath("/settings");
    return { ok: true, data: undefined };
  }, "Failed to revoke ownership transfer");
}

/**
 * Target-side decline. Used by the recipient when they don't want the
 * transfer — distinct from `revokeOwnershipTransfer` which is the
 * initiator's cancel path. Doesn't require an active org membership since
 * the target's membership in that org is what the transfer is about, and
 * declining should work regardless of their current active-org state.
 */
export async function declineOwnershipTransfer(
  transferId: string,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const session = await requireUser();
    const idCheck = cuidSchema.safeParse(transferId);
    if (!idCheck.success) return { ok: false, error: "Invalid transfer ID" };

    const transfer = await prisma.ownershipTransfer.findUnique({
      where: { id: idCheck.data },
      select: {
        id: true,
        organizationId: true,
        fromUserId: true,
        toUserId: true,
        status: true,
      },
    });
    if (!transfer || transfer.toUserId !== session.user.id) {
      // Same generic response for "not found" and "not yours" — enumeration
      // defense mirrors the accept page.
      return { ok: false, error: "Transfer not found" };
    }
    if (transfer.status !== "pending") {
      return {
        ok: false,
        error: `Transfer is ${transfer.status}, not pending`,
      };
    }

    await prisma.ownershipTransfer.update({
      where: { id: transfer.id },
      data: { status: "declined", revokedAt: new Date() },
    });

    await audit({
      userId: session.user.id,
      organizationId: transfer.organizationId,
      action: "ownership_transfer_declined",
      entityType: "organization",
      entityId: transfer.organizationId,
      changes: {
        transferId: transfer.id,
        fromUserId: transfer.fromUserId,
      },
    });

    return { ok: true, data: undefined };
  }, "Failed to decline ownership transfer");
}
