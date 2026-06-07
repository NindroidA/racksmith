"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Buildings,
  Crown,
  Key,
  Envelope,
  ArrowsClockwise,
  FloppyDisk,
  PaperPlaneTilt,
  ShieldCheck,
  TrashSimple,
  UserMinus,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Select, SelectOption } from "@/components/ui/select";
import { Tag } from "@/components/ui/tag";
import { useOrgAction } from "@/hooks/use-org-action";
import { OWNERSHIP_TRANSFER_TTL_DAYS } from "@/lib/ownership-transfer-constants";
import {
  ASSIGNABLE_ROLES,
  isRole,
  roleLabel,
  type Role,
} from "@/lib/permissions";
import {
  deleteOrganization,
  inviteMember,
  removeMember,
  renameOrganization,
  requestOwnershipTransfer,
  resendInvitation,
  revokeInvitation,
  revokeOwnershipTransfer,
  updateMemberRole,
  updateOrganizationSlug,
} from "./organization-actions";

type MemberRow = {
  id: string;
  role: Role;
  joinedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

type InvitationRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
};

type PendingTransfer = {
  id: string;
  expiresAt: Date;
  toUser: { id: string; name: string | null; email: string };
};

type Props = {
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  viewerRole: Role;
  viewerUserId: string;
  members: MemberRow[];
  invitations: InvitationRow[];
  pendingTransfer: PendingTransfer | null;
  scrollIntoView?: boolean;
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};

function timeUntil(d: Date): string {
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 2) return `in ${days} days`;
  if (days === 1) return "in 1 day";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `in ${hours}h`;
  const mins = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `in ${mins}m`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function OrganizationSection({
  organization,
  viewerRole,
  viewerUserId,
  members,
  invitations,
  pendingTransfer,
  scrollIntoView = false,
}: Props) {
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [renamePending, startRename] = useTransition();
  const [slugPending, startSlug] = useTransition();
  const [memberPending, startMember] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, startDelete] = useTransition();
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [removeMemberTarget, setRemoveMemberTarget] =
    useState<MemberRow | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<Exclude<Role, "owner">>("member");
  const [invitePending, startInvite] = useTransition();
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [revokeInviteTarget, setRevokeInviteTarget] =
    useState<InvitationRow | null>(null);

  const [transferTarget, setTransferTarget] = useState<MemberRow | null>(null);
  const [transferPending, startTransfer] = useTransition();
  const [revokeTransferOpen, setRevokeTransferOpen] = useState(false);

  const runRename = useOrgAction(startRename);
  const runSlug = useOrgAction(startSlug);
  const runMember = useOrgAction(startMember);
  const runDelete = useOrgAction(startDelete);
  const runInvite = useOrgAction(startInvite);
  const runTransfer = useOrgAction(startTransfer);

  const canEditGeneral = viewerRole === "admin" || viewerRole === "owner";
  const canManageMembers = canEditGeneral;
  const canInvite = canManageMembers;
  const canDeleteOrg = viewerRole === "owner";
  const canTransferOwnership = viewerRole === "owner";

  useEffect(() => {
    if (!scrollIntoView) return;
    const el = document.getElementById("organization-section");
    if (!el) return;
    el.scrollIntoView({ block: "start", behavior: "smooth" });
    // Move focus to the section so screen readers announce the landing
    // point (via aria-labelledby on the heading). `preventScroll: true`
    // keeps the smooth-scroll above from being cut short by the focus
    // triggering an instant scroll.
    (el as HTMLElement).focus({ preventScroll: true });
  }, [scrollIntoView]);

  const submitRename = () => {
    const trimmed = name.trim();
    if (trimmed === organization.name) return;
    runRename(() => renameOrganization({ name: trimmed }), {
      okMessage: "Organization renamed",
    });
  };

  const submitSlug = () => {
    const trimmed = slug.trim();
    if (trimmed === organization.slug) return;
    runSlug(() => updateOrganizationSlug({ slug: trimmed }), {
      okMessage: "Slug updated",
    });
  };

  const changeRole = (memberId: string, newRole: Exclude<Role, "owner">) => {
    setPendingMemberId(memberId);
    runMember(() => updateMemberRole({ memberId, role: newRole }), {
      okMessage: "Role updated",
      onSettled: () => setPendingMemberId(null),
    });
  };

  const confirmRemove = () => {
    if (!removeMemberTarget) return;
    const targetId = removeMemberTarget.id;
    setPendingMemberId(targetId);
    runMember(() => removeMember(targetId), {
      okMessage: "Member removed",
      onSettled: () => {
        setPendingMemberId(null);
        setRemoveMemberTarget(null);
      },
    });
  };

  const performDelete = () => {
    runDelete(() => deleteOrganization({ confirmName: name }), {
      okMessage: "Organization deleted",
      noRefresh: true,
      // Server cleared activeOrganizationId — next nav will hit
      // /onboarding/welcome which picks another membership.
      onSuccess: () => {
        window.location.href = "/onboarding/welcome";
      },
    });
  };

  const submitInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed) return;
    runInvite(() => inviteMember({ email: trimmed, role: inviteRole }), {
      okMessage: `Invitation sent to ${trimmed}`,
      onSuccess: () => setInviteEmail(""),
    });
  };

  const doResendInvite = (id: string) => {
    setPendingInviteId(id);
    runInvite(() => resendInvitation(id), {
      okMessage: "Invitation re-sent",
      onSettled: () => setPendingInviteId(null),
      noRefresh: true,
    });
  };

  const confirmRevokeInvite = () => {
    if (!revokeInviteTarget) return;
    const id = revokeInviteTarget.id;
    setPendingInviteId(id);
    runInvite(() => revokeInvitation(id), {
      okMessage: "Invitation revoked",
      onSettled: () => {
        setPendingInviteId(null);
        setRevokeInviteTarget(null);
      },
    });
  };

  const confirmTransfer = () => {
    if (!transferTarget) return;
    const id = transferTarget.id;
    const recipientEmail = transferTarget.user.email;
    runTransfer(() => requestOwnershipTransfer(id), {
      okMessage: `Confirmation email sent to ${recipientEmail}. They have ${OWNERSHIP_TRANSFER_TTL_DAYS} day${OWNERSHIP_TRANSFER_TTL_DAYS === 1 ? "" : "s"} to accept.`,
      onSettled: () => setTransferTarget(null),
    });
  };

  const doRevokeTransfer = () => {
    if (!pendingTransfer) return;
    const id = pendingTransfer.id;
    runTransfer(() => revokeOwnershipTransfer(id), {
      okMessage: "Transfer canceled",
      onSettled: () => setRevokeTransferOpen(false),
    });
  };

  return (
    <section
      id="organization-section"
      tabIndex={-1}
      aria-labelledby="organization-section-heading"
      className="flex flex-col gap-6 scroll-mt-24 focus:outline-none"
    >
      {/* General */}
      <div className="surface-card p-6">
        <header className="mb-4 flex items-center gap-3">
          <Buildings className="h-5 w-5 text-primary" weight="duotone" />
          <div>
            <h2
              id="organization-section-heading"
              className="text-base font-semibold text-white"
            >
              Organization
            </h2>
            <p className="text-sm text-white/50">
              Settings for{" "}
              <span className="font-medium text-white">
                {organization.name}
              </span>
              .
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="org-name"
              className="mb-1.5 block text-sm font-medium text-white/70"
            >
              Name
            </label>
            <div className="flex gap-2">
              <input
                id="org-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEditGeneral || renamePending}
                maxLength={80}
                className="glass-input flex-1 rounded-lg px-4 py-2.5 text-sm disabled:opacity-50"
                autoComplete="off"
                data-1p-ignore
              />
              <Button
                variant="primary"
                onClick={submitRename}
                disabled={
                  !canEditGeneral ||
                  renamePending ||
                  name.trim() === organization.name ||
                  name.trim().length < 2
                }
                iconLeft={
                  <FloppyDisk className="h-4 w-4" weight="bold" aria-hidden />
                }
              >
                Save
              </Button>
            </div>
          </div>

          <div>
            <label
              htmlFor="org-slug"
              className="mb-1.5 block text-sm font-medium text-white/70"
            >
              URL slug
            </label>
            <div className="flex gap-2">
              <input
                id="org-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                disabled={!canEditGeneral || slugPending}
                maxLength={63}
                className="glass-input mono flex-1 rounded-lg px-4 py-2.5 text-sm disabled:opacity-50"
                autoComplete="off"
                data-1p-ignore
              />
              <Button
                variant="primary"
                onClick={submitSlug}
                disabled={
                  !canEditGeneral ||
                  slugPending ||
                  slug.trim() === organization.slug ||
                  slug.trim().length < 2
                }
                iconLeft={
                  <FloppyDisk className="h-4 w-4" weight="bold" aria-hidden />
                }
              >
                Save
              </Button>
            </div>
            <p className="mt-1 text-xs text-white/40">
              Lowercase, numbers, and dashes only.
            </p>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-white/70">
              Plan
            </span>
            {/* aria-label spells the plan in sentence case so SRs don't
                read the uppercase CSS letter-by-letter. */}
            <Tag
              tone="neutral"
              variant="subtle"
              size="md"
              aria-label={`Plan: ${PLAN_LABELS[organization.plan] ?? organization.plan}`}
              iconLeft={
                <ShieldCheck className="h-3.5 w-3.5" weight="duotone" />
              }
            >
              {PLAN_LABELS[organization.plan] ?? organization.plan}
            </Tag>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-white/70">
              Your role
            </span>
            <Tag
              tone="info"
              variant="subtle"
              size="md"
              aria-label={`Your role: ${roleLabel(viewerRole)}`}
              iconLeft={
                viewerRole === "owner" ? (
                  <Crown className="h-3.5 w-3.5" weight="duotone" />
                ) : undefined
              }
            >
              {roleLabel(viewerRole)}
            </Tag>
          </div>
        </div>
      </div>

      {/* Pending ownership transfer */}
      {pendingTransfer && (
        <div className="flex items-start gap-3 rounded-xl border border-accent-orange/30 bg-accent-orange/[0.05] px-5 py-4">
          <Key
            className="mt-0.5 h-5 w-5 shrink-0 text-accent-orange"
            weight="duotone"
            aria-hidden
          />
          <div className="min-w-0 flex-1 text-sm text-white/80">
            <div className="font-medium text-white">
              Ownership transfer pending
            </div>
            <p className="text-xs text-white/60">
              Waiting for{" "}
              <span className="font-medium text-white">
                {pendingTransfer.toUser.name ?? pendingTransfer.toUser.email}
              </span>{" "}
              to confirm. Expires {timeUntil(pendingTransfer.expiresAt)}.
            </p>
          </div>
          {canTransferOwnership && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRevokeTransferOpen(true)}
              disabled={transferPending}
              className="shrink-0"
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Members */}
      <div className="surface-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-white">Members</h3>
            <p className="text-xs text-white/50">
              <span className="mono">{members.length}</span>{" "}
              {members.length === 1 ? "person" : "people"} in this workspace
            </p>
          </div>
        </header>
        <ul className="divide-y divide-white/[0.04]">
          {members.map((m) => {
            const isViewer = m.user.id === viewerUserId;
            const isOwner = m.role === "owner";
            const rowPending = pendingMemberId === m.id;
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 px-6 py-3.5 text-sm"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-semibold text-white/70"
                  aria-hidden
                >
                  {initials(m.user.name ?? m.user.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-white">
                    {m.user.name ?? m.user.email}
                    {isViewer && (
                      <Tag tone="neutral" variant="subtle" className="ml-2">
                        You
                      </Tag>
                    )}
                  </div>
                  <div className="truncate text-xs text-white/40">
                    {m.user.email}
                  </div>
                </div>
                {isOwner ? (
                  <Tag
                    tone="warning"
                    variant="subtle"
                    aria-label="Owner"
                    iconLeft={<Crown className="h-3 w-3" weight="duotone" />}
                  >
                    Owner
                  </Tag>
                ) : canManageMembers && !isViewer ? (
                  <Select
                    aria-label={`Change role for ${m.user.name ?? m.user.email}`}
                    value={m.role}
                    disabled={rowPending || memberPending}
                    onValueChange={(v) =>
                      changeRole(m.id, v as Exclude<Role, "owner">)
                    }
                    className="px-2 py-1 text-xs"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <SelectOption key={r} value={r}>
                        {roleLabel(r)}
                      </SelectOption>
                    ))}
                  </Select>
                ) : (
                  <Tag
                    tone="neutral"
                    variant="subtle"
                    aria-label={roleLabel(m.role)}
                  >
                    {roleLabel(m.role)}
                  </Tag>
                )}
                {canTransferOwnership &&
                  !isOwner &&
                  !isViewer &&
                  !pendingTransfer && (
                    <button
                      type="button"
                      onClick={() => setTransferTarget(m)}
                      disabled={rowPending || transferPending}
                      title="Transfer ownership to this member"
                      aria-label={`Transfer ownership to ${m.user.name ?? m.user.email}`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/40 transition-colors hover:bg-accent-orange/15 hover:text-accent-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange/50 disabled:opacity-40"
                    >
                      <Key className="h-4 w-4" weight="duotone" aria-hidden />
                    </button>
                  )}
                {canManageMembers && !isOwner && !isViewer && (
                  <button
                    type="button"
                    onClick={() => setRemoveMemberTarget(m)}
                    disabled={rowPending || memberPending}
                    title="Remove from organization"
                    aria-label={`Remove ${m.user.name ?? m.user.email}`}
                    className={twMerge(
                      "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/40 transition-colors hover:bg-accent-red/15 hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/50",
                      "disabled:opacity-40",
                    )}
                  >
                    <UserMinus
                      className="h-4 w-4"
                      weight="duotone"
                      aria-hidden
                    />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Invite + pending invitations */}
      {canInvite && (
        <div className="surface-card overflow-hidden">
          <header className="border-b border-white/[0.08] px-6 py-4">
            <h3 className="text-base font-semibold text-white">
              Invite teammates
            </h3>
            <p className="text-xs text-white/50">
              They get an email with a link that expires in 7 days.
            </p>
          </header>
          <form
            onSubmit={submitInvite}
            className="grid grid-cols-1 items-end gap-3 px-6 py-4 sm:grid-cols-[1fr_140px_auto]"
          >
            <div>
              <label
                htmlFor="invite-email"
                className="mb-1.5 block text-xs font-medium text-white/60"
              >
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={invitePending}
                required
                maxLength={254}
                placeholder="teammate@company.com"
                autoComplete="off"
                data-1p-ignore
                className="glass-input w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label
                htmlFor="invite-role"
                className="mb-1.5 block text-xs font-medium text-white/60"
              >
                Role
              </label>
              <Select
                id="invite-role"
                value={inviteRole}
                onValueChange={(v) =>
                  setInviteRole(v as Exclude<Role, "owner">)
                }
                disabled={invitePending}
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectOption key={r} value={r}>
                    {roleLabel(r)}
                  </SelectOption>
                ))}
              </Select>
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={invitePending || inviteEmail.trim().length === 0}
              aria-busy={invitePending}
              className="min-h-[44px]"
              iconLeft={
                <PaperPlaneTilt className="h-4 w-4" weight="bold" aria-hidden />
              }
            >
              {invitePending ? "Sending..." : "Invite"}
            </Button>
          </form>

          {invitations.length > 0 && (
            <>
              <div className="border-t border-white/[0.04] px-6 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Pending invitations (
                <span className="mono">{invitations.length}</span>)
              </div>
              <ul className="divide-y divide-white/[0.04]">
                {invitations.map((inv) => {
                  const rowPending = pendingInviteId === inv.id;
                  const expired = inv.expiresAt.getTime() < Date.now();
                  return (
                    <li
                      key={inv.id}
                      className="flex items-center gap-3 px-6 py-3 text-sm"
                    >
                      <Envelope
                        className="h-4 w-4 shrink-0 text-white/40"
                        weight="duotone"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-white">{inv.email}</div>
                        <div className="text-xs text-white/40">
                          {roleLabel(isRole(inv.role) ? inv.role : "viewer")} ·{" "}
                          {expired ? (
                            <span className="text-accent-red">expired</span>
                          ) : (
                            <>expires {timeUntil(inv.expiresAt)}</>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => doResendInvite(inv.id)}
                        disabled={rowPending || invitePending || expired}
                        aria-busy={rowPending}
                        title={
                          expired
                            ? "Invitation expired — revoke and re-invite"
                            : "Resend invitation email"
                        }
                        aria-label={
                          expired
                            ? `Invitation to ${inv.email} has expired — resend unavailable`
                            : `Resend invitation to ${inv.email}`
                        }
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 disabled:opacity-30"
                      >
                        <ArrowsClockwise
                          className="h-4 w-4"
                          weight="bold"
                          aria-hidden
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevokeInviteTarget(inv)}
                        disabled={rowPending || invitePending}
                        aria-busy={rowPending}
                        title="Revoke invitation"
                        aria-label={`Revoke invitation to ${inv.email}`}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/40 transition-colors hover:bg-accent-red/15 hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/50 disabled:opacity-30"
                      >
                        <X className="h-4 w-4" weight="bold" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Danger zone — owner only */}
      {canDeleteOrg && (
        <div className="rounded-xl border border-accent-red/20 bg-accent-red/[0.03] p-6">
          <header className="mb-3 flex items-center gap-3">
            <TrashSimple
              className="h-5 w-5 text-accent-red"
              weight="duotone"
              aria-hidden
            />
            <div>
              <h3 className="text-base font-semibold text-white">
                Danger zone
              </h3>
              <p className="text-sm text-white/50">
                Permanent. Cannot be undone.
              </p>
            </div>
          </header>
          <p className="mb-3 text-sm text-white/70">
            Deleting{" "}
            <span className="font-semibold text-white">
              {organization.name}
            </span>{" "}
            removes every rack, device, subnet, VLAN, plan, scan, and audit log
            inside it. Members lose access immediately.
          </p>
          <Button
            variant="danger"
            onClick={() => setDeleteOpen(true)}
            disabled={deletePending}
            iconLeft={
              <TrashSimple className="h-4 w-4" weight="bold" aria-hidden />
            }
          >
            Delete organization
          </Button>
        </div>
      )}

      {/* Confirm dialogs */}
      <DeleteConfirmDialog
        open={Boolean(removeMemberTarget)}
        onClose={() => !memberPending && setRemoveMemberTarget(null)}
        title="Remove member?"
        body={
          removeMemberTarget && (
            <p>
              <span className="font-semibold text-white">
                {removeMemberTarget.user.name ?? removeMemberTarget.user.email}
              </span>{" "}
              loses access to this workspace immediately. Their personal racks,
              devices, and assignments stay intact (owned by the org, not them).
            </p>
          )
        }
        confirmLabel="Remove member"
        pending={memberPending}
        onConfirm={confirmRemove}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => !deletePending && setDeleteOpen(false)}
        title="Delete organization?"
        body={
          <p>
            This will permanently delete{" "}
            <span className="font-semibold text-white">
              {organization.name}
            </span>{" "}
            and every rack, device, subnet, VLAN, plan, scan, and audit log
            inside. A JSON snapshot is saved to the deployment host before the
            cascade fires. This cannot be undone from the UI.
          </p>
        }
        confirmLabel="Delete organization"
        requireTypeName={organization.name}
        pending={deletePending}
        onConfirm={performDelete}
      />

      <DeleteConfirmDialog
        open={Boolean(revokeInviteTarget)}
        onClose={() => !invitePending && setRevokeInviteTarget(null)}
        title="Revoke invitation?"
        body={
          revokeInviteTarget && (
            <p>
              The link sent to{" "}
              <span className="font-semibold text-white">
                {revokeInviteTarget.email}
              </span>{" "}
              stops working immediately. You can re-invite them later if you
              change your mind.
            </p>
          )
        }
        confirmLabel="Revoke invitation"
        pending={invitePending}
        onConfirm={confirmRevokeInvite}
      />

      <DeleteConfirmDialog
        open={Boolean(transferTarget)}
        onClose={() => !transferPending && setTransferTarget(null)}
        title="Transfer ownership?"
        body={
          transferTarget && (
            <p>
              An email goes to{" "}
              <span className="font-semibold text-white">
                {transferTarget.user.name ?? transferTarget.user.email}
              </span>{" "}
              with a {OWNERSHIP_TRANSFER_TTL_DAYS}-day confirmation link.
              Nothing changes until they confirm. After they do, you become an
              admin and they become the owner.
            </p>
          )
        }
        confirmLabel="Send confirmation"
        pending={transferPending}
        onConfirm={confirmTransfer}
      />

      <DeleteConfirmDialog
        open={revokeTransferOpen}
        onClose={() => !transferPending && setRevokeTransferOpen(false)}
        title="Cancel ownership transfer?"
        body={
          pendingTransfer && (
            <p>
              The pending transfer to{" "}
              <span className="font-semibold text-white">
                {pendingTransfer.toUser.name ?? pendingTransfer.toUser.email}
              </span>{" "}
              is canceled. Their confirmation link stops working immediately.
            </p>
          )
        }
        confirmLabel="Cancel transfer"
        pending={transferPending}
        onConfirm={doRevokeTransfer}
      />
    </section>
  );
}
