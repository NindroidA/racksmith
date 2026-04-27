import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Mail, Wrench } from "lucide-react";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isRole, roleLabel } from "@/lib/permissions";
import { InviteAcceptForm } from "./invite-accept-form";

/**
 * Invitation accept landing page. Reached via the link in the invitation
 * email. Shows organization details only after validating the token + that
 * the signed-in user's email matches (enumeration defense — anonymous
 * visitors can't probe random invitation IDs).
 */
export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  // Logged out: bounce through login with this URL as the callback so the
  // user lands back here after authenticating.
  if (!session?.user) {
    const callback = encodeURIComponent(`/invite/${id}`);
    redirect(`/login?callbackURL=${callback}`);
  }

  // All four validity predicates (id, email-matches-signed-in, pending,
  // not-expired) collapse into a single findFirst so:
  //   - Response time is uniform across "invalid id", "wrong email",
  //     "expired", "revoked" — no timing leak to help enumerate ids.
  //   - The invitation.email never reaches this render path when the
  //     signed-in user isn't the intended recipient, so we can't
  //     accidentally render it into the failure page and leak it.
  const invitation = await prisma.invitation.findFirst({
    where: {
      id,
      email: { equals: session.user.email, mode: "insensitive" },
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
      role: true,
      organization: { select: { id: true, name: true, slug: true } },
      inviter: { select: { name: true, email: true } },
    },
  });

  if (!invitation) {
    // Every failure mode (bad id, wrong signed-in email, expired, already
    // used) renders the same generic page. The signed-in-account hint
    // below gives legitimate users who logged in with the wrong account
    // an actionable next step without naming the target email.
    return (
      <Shell>
        <Header
          title="Invitation no longer valid"
          subtitle="This link may have expired, been revoked, or already been used."
        />
        <p className="mt-4 text-sm text-white/60">
          If you&rsquo;re expecting an invitation and have more than one
          account, try signing out and signing back in with the email that
          received the invitation.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          Go to dashboard
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
          <Building2 className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-white">
            {invitation.organization.name}
          </h1>
          <p className="text-xs text-white/50">
            / {invitation.organization.slug}
          </p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-white/70">
        <span className="font-medium text-white">
          {invitation.inviter.name || invitation.inviter.email}
        </span>{" "}
        invited you to join as{" "}
        <span className="font-medium text-white">
          {roleLabel(isRole(invitation.role) ? invitation.role : "viewer")}
        </span>
        .
      </p>
      <p className="mt-3 flex items-center gap-2 text-xs text-white/50">
        <Mail className="h-3.5 w-3.5" aria-hidden />
        Invitation sent to {invitation.email}
      </p>

      <InviteAcceptForm invitationId={invitation.id} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8">
        <div className="mb-5 flex items-center gap-2 text-sm text-white/50">
          <Wrench className="h-4 w-4 text-primary" aria-hidden />
          RackSmith
        </div>
        {children}
      </div>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <p className="mt-1 text-sm text-white/60">{subtitle}</p>
    </div>
  );
}
