import { redirect } from "next/navigation";
import Link from "next/link";
import { randomBytes } from "node:crypto";
import { Wrench, ArrowRight, Settings } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { generateSlugFromName, validateSlug } from "@/lib/slug";

/**
 * Onboarding entry point for users without an active Organization. Auto-
 * creates a personal Organization on first visit and sets it as the active
 * org, then shows a "customize or skip" prompt. After customize-or-skip the
 * user lands on /dashboard with the new org loaded into their session.
 *
 * Phase 10a Foundation: this page fills the gap between sign-up (creates User)
 * and dashboard access (requires Organization). Phase 10c will replace the
 * barebones UI with the full customize form wired to server actions.
 */
export default async function WelcomePage() {
  const session = await requireUser();
  const userId = session.user.id;
  // Read activeOrganizationId from DB — the session copy can lag a write
  // from a previous visit or from an invite-accept flow.
  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeOrganizationId: true },
  });
  const currentActiveOrgId = userRow?.activeOrganizationId ?? null;

  // Already has an active org → dashboard.
  if (currentActiveOrgId) {
    redirect("/dashboard");
  }

  // Check if a Member row already exists (in case of race / retry); use any
  // of the user's memberships before creating a new personal org.
  const existingMembership = await prisma.member.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true, organization: { select: { name: true } } },
  });

  let organizationId: string;
  let organizationName: string;

  if (existingMembership) {
    organizationId = existingMembership.organizationId;
    organizationName = existingMembership.organization.name;
    await prisma.user.update({
      where: { id: userId },
      data: { activeOrganizationId: organizationId },
    });
  } else {
    const userName =
      session.user.name && session.user.name.trim() !== ""
        ? session.user.name
        : "My";
    // Pick a valid slug — retry with fresh random suffix if the blocklist /
    // collision hits. The blocklist is the likely failure mode (e.g. user
    // named "admin"); collision is only possible if the userId prefix hits
    // an existing org using the same name base, which is vanishingly rare.
    let slug: string | null = null;
    for (let i = 0; i < 8 && !slug; i++) {
      const suffix =
        i === 0
          ? userId.slice(0, 8)
          : randomBytes(4).toString("hex").slice(0, 6);
      const candidate = generateSlugFromName(userName, suffix);
      if (validateSlug(candidate) === null) {
        slug = candidate;
      }
    }
    if (!slug) {
      // Ultimate fallback — should never hit in practice.
      slug = `org-${randomBytes(6).toString("hex")}`;
    }
    const name = `${userName}'s Organization`;

    const created = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          slug,
          plan: "free",
        },
        select: { id: true, name: true },
      });
      await tx.member.create({
        data: {
          userId,
          organizationId: org.id,
          role: "owner",
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { activeOrganizationId: org.id },
      });
      return org;
    });

    organizationId = created.id;
    organizationName = created.name;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel w-full max-w-xl rounded-2xl p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <Wrench className="h-7 w-7 text-primary" />
          </div>
          <h1 className="gradient-text text-2xl font-bold">
            Welcome to RackSmith
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Your organization{" "}
            <span className="font-medium text-white">{organizationName}</span>{" "}
            is ready.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-white/70">
          Everything in RackSmith lives inside an organization — racks, devices,
          subnets, VLANs. You can invite teammates later from{" "}
          <span className="font-medium text-white">
            Settings → Organization
          </span>
          , or rename the org to match your team.
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link
            href="/settings?tab=organization"
            className="glass-button inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
          >
            <Settings className="h-4 w-4" aria-hidden />
            Customize
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90"
          >
            Skip to dashboard
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
