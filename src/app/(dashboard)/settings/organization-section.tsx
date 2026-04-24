"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";
import {
  Building2,
  Crown,
  KeyRound,
  Mail,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  UserMinus,
  X,
} from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Select, SelectOption } from "@/components/ui/select";
import { ASSIGNABLE_ROLES, roleLabel, type Role } from "@/lib/permissions";
import { OWNERSHIP_TRANSFER_TTL_DAYS } from "@/lib/ownership-transfer-constants";
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
  const router = useRouter();
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
    startRename(async () => {
      const result = await renameOrganization({ name: trimmed });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Organization renamed");
      router.refresh();
    });
  };

  const submitSlug = () => {
    const trimmed = slug.trim();
    if (trimmed === organization.slug) return;
    startSlug(async () => {
      const result = await updateOrganizationSlug({ slug: trimmed });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Slug updated");
      router.refresh();
    });
  };

  const changeRole = (memberId: string, newRole: Exclude<Role, "owner">) => {
    setPendingMemberId(memberId);
    startMember(async () => {
      const result = await updateMemberRole({ memberId, role: newRole });
      setPendingMemberId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Role updated");
      router.refresh();
    });
  };

  const confirmRemove = () => {
    if (!removeMemberTarget) return;
    const targetId = removeMemberTarget.id;
    setPendingMemberId(targetId);
    startMember(async () => {
      const result = await removeMember(targetId);
      setPendingMemberId(null);
      if (!result.ok) {
        toast.error(result.error);
        setRemoveMemberTarget(null);
        return;
      }
      toast.success("Member removed");
      setRemoveMemberTarget(null);
      router.refresh();
    });
  };

  const performDelete = () => {
    startDelete(async () => {
      const result = await deleteOrganization({ confirmName: name });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Organization deleted");
      // Server cleared activeOrganizationId — next nav will hit
      // /onboarding/welcome which picks another membership.
      window.location.href = "/onboarding/welcome";
    });
  };

  const submitInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed) return;
    startInvite(async () => {
      const result = await inviteMember({ email: trimmed, role: inviteRole });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Invitation sent to ${trimmed}`);
      setInviteEmail("");
      router.refresh();
    });
  };

  const doResendInvite = (id: string) => {
    setPendingInviteId(id);
    startInvite(async () => {
      const result = await resendInvitation(id);
      setPendingInviteId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Invitation re-sent");
    });
  };

  const confirmRevokeInvite = () => {
    if (!revokeInviteTarget) return;
    const id = revokeInviteTarget.id;
    setPendingInviteId(id);
    startInvite(async () => {
      const result = await revokeInvitation(id);
      setPendingInviteId(null);
      if (!result.ok) {
        toast.error(result.error);
        setRevokeInviteTarget(null);
        return;
      }
      toast.success("Invitation revoked");
      setRevokeInviteTarget(null);
      router.refresh();
    });
  };

  const confirmTransfer = () => {
    if (!transferTarget) return;
    const id = transferTarget.id;
    startTransfer(async () => {
      const result = await requestOwnershipTransfer(id);
      if (!result.ok) {
        toast.error(result.error);
        setTransferTarget(null);
        return;
      }
      toast.success(
        `Confirmation email sent to ${transferTarget.user.email}. They have ${OWNERSHIP_TRANSFER_TTL_DAYS} day${OWNERSHIP_TRANSFER_TTL_DAYS === 1 ? "" : "s"} to accept.`,
      );
      setTransferTarget(null);
      router.refresh();
    });
  };

  const doRevokeTransfer = () => {
    if (!pendingTransfer) return;
    const id = pendingTransfer.id;
    startTransfer(async () => {
      const result = await revokeOwnershipTransfer(id);
      if (!result.ok) {
        toast.error(result.error);
        setRevokeTransferOpen(false);
        return;
      }
      toast.success("Transfer canceled");
      setRevokeTransferOpen(false);
      router.refresh();
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
      <div className="glass-card rounded-xl p-6">
        <header className="mb-4 flex items-center gap-3">
          <Building2 className="h-5 w-5 text-primary" />
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
              <button
                type="button"
                onClick={submitRename}
                disabled={
                  !canEditGeneral ||
                  renamePending ||
                  name.trim() === organization.name ||
                  name.trim().length < 2
                }
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                <Save className="h-4 w-4" aria-hidden />
                Save
              </button>
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
                className="glass-input flex-1 rounded-lg px-4 py-2.5 font-mono text-sm disabled:opacity-50"
                autoComplete="off"
                data-1p-ignore
              />
              <button
                type="button"
                onClick={submitSlug}
                disabled={
                  !canEditGeneral ||
                  slugPending ||
                  slug.trim() === organization.slug ||
                  slug.trim().length < 2
                }
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                <Save className="h-4 w-4" aria-hidden />
                Save
              </button>
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
            <span
              aria-label={`Plan: ${PLAN_LABELS[organization.plan] ?? organization.plan}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/70"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {PLAN_LABELS[organization.plan] ?? organization.plan}
            </span>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-white/70">
              Your role
            </span>
            <span
              aria-label={`Your role: ${roleLabel(viewerRole)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary"
            >
              {viewerRole === "owner" && (
                <Crown className="h-3.5 w-3.5" aria-hidden />
              )}
              {roleLabel(viewerRole)}
            </span>
          </div>
        </div>
      </div>

      {/* Pending ownership transfer */}
      {pendingTransfer && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/30 bg-amber-300/[0.05] px-5 py-4">
          <KeyRound
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-200"
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
            <button
              type="button"
              onClick={() => setRevokeTransferOpen(true)}
              disabled={transferPending}
              className="shrink-0 rounded-md border border-white/[0.12] px-2.5 py-1 text-xs text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Members */}
      <div className="glass-card overflow-hidden rounded-xl">
        <header className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-white">Members</h3>
            <p className="text-xs text-white/50">
              {members.length} {members.length === 1 ? "person" : "people"} in
              this workspace
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
                      <span className="ml-2 rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
                        You
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-white/40">
                    {m.user.email}
                  </div>
                </div>
                {isOwner ? (
                  <span
                    aria-label="Owner"
                    className="flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200"
                  >
                    <Crown className="h-3 w-3" aria-hidden />
                    Owner
                  </span>
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
                  <span
                    aria-label={roleLabel(m.role)}
                    className="rounded-full border border-white/[0.1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/60"
                  >
                    {roleLabel(m.role)}
                  </span>
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
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/40 transition-colors hover:bg-amber-300/15 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 disabled:opacity-40"
                    >
                      <KeyRound className="h-4 w-4" aria-hidden />
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
                    <UserMinus className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Invite + pending invitations */}
      {canInvite && (
        <div className="glass-card overflow-hidden rounded-xl">
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
            <button
              type="submit"
              disabled={invitePending || inviteEmail.trim().length === 0}
              aria-busy={invitePending}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <Send className="h-4 w-4" aria-hidden />
              {invitePending ? "Sending..." : "Invite"}
            </button>
          </form>

          {invitations.length > 0 && (
            <>
              <div className="border-t border-white/[0.04] px-6 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Pending invitations ({invitations.length})
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
                      <Mail
                        className="h-4 w-4 shrink-0 text-white/40"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-white">{inv.email}</div>
                        <div className="text-xs text-white/40">
                          {roleLabel(inv.role as Role)} ·{" "}
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
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 disabled:opacity-30"
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden />
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
                        <X className="h-4 w-4" aria-hidden />
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
            <Trash2 className="h-5 w-5 text-accent-red" aria-hidden />
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
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={deletePending}
            className="flex items-center gap-2 rounded-lg border border-accent-red/40 bg-accent-red/15 px-4 py-2 text-sm font-medium text-accent-red transition-colors hover:bg-accent-red/25 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete organization
          </button>
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
