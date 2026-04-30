import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { isRole, roleHasAccess } from "@/lib/permissions";
import { TIER_LIMITS } from "@/lib/tiers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  // Fold billing fields (plan, paymentStatus) into the existing membership
  // query so the payment-status banner doesn't trigger a second org lookup
  // on every dashboard navigation.
  const [profile, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profileCompletedAt: true, activeOrganizationId: true },
    }),
    prisma.member.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            plan: true,
            paymentStatus: true,
          },
        },
      },
    }),
  ]);

  const orgList = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role,
  }));
  const activeOrgId = profile?.activeOrganizationId ?? null;
  const activeMembership =
    memberships.find((m) => m.organization.id === activeOrgId) ?? null;
  const activeOrg = activeMembership
    ? {
        id: activeMembership.organization.id,
        name: activeMembership.organization.name,
        role: activeMembership.role,
      }
    : null;

  // Surface the past-due payment banner site-wide for billing-capable
  // members of the active org. Non-admins can't fix the issue (the
  // portal session action is admin-gated), so we hide the banner from
  // them — they'd get an actionless alarm bell.
  let paymentBanner: { planLabel: string } | null = null;
  if (
    activeMembership &&
    isRole(activeMembership.role) &&
    roleHasAccess(activeMembership.role, "admin") &&
    activeMembership.organization.paymentStatus === "past_due"
  ) {
    // Guard against drift in the plan column rather than casting — an
    // unexpected value falls through to "Free" instead of throwing on
    // a TIER_LIMITS lookup.
    const planValue = activeMembership.organization.plan;
    const planKey =
      typeof planValue === "string" && planValue in TIER_LIMITS
        ? (planValue as keyof typeof TIER_LIMITS)
        : "free";
    paymentBanner = { planLabel: TIER_LIMITS[planKey].label };
  }

  return (
    <SidebarProvider>
      <DashboardShell
        unverifiedEmail={session.user.emailVerified ? null : session.user.email}
        needsProfile={!profile?.profileCompletedAt}
        activeOrgId={activeOrg?.id ?? null}
        activeOrgName={activeOrg?.name ?? null}
        memberships={orgList}
        paymentBanner={paymentBanner}
      >
        {children}
      </DashboardShell>
    </SidebarProvider>
  );
}
