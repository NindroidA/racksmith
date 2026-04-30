import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { isRole, roleHasAccess } from "@/lib/permissions";
import { TIER_LIMITS, type Plan } from "@/lib/tiers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
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
        organization: { select: { id: true, name: true } },
      },
    }),
  ]);

  const orgList = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role,
  }));
  const activeOrgId = profile?.activeOrganizationId ?? null;
  const activeOrg = orgList.find((o) => o.id === activeOrgId) ?? null;

  // Surface the past-due payment banner site-wide for billing-capable
  // members of the active org. Non-admins can't fix the issue (the
  // portal session action is admin-gated), so we hide the banner from
  // them — they'd get an actionless alarm bell.
  let paymentBanner: { planLabel: string } | null = null;
  if (
    activeOrg &&
    isRole(activeOrg.role) &&
    roleHasAccess(activeOrg.role, "admin")
  ) {
    const orgBilling = await prisma.organization.findUnique({
      where: { id: activeOrg.id },
      select: { paymentStatus: true, plan: true },
    });
    if (orgBilling?.paymentStatus === "past_due") {
      paymentBanner = {
        planLabel: TIER_LIMITS[(orgBilling.plan ?? "free") as Plan].label,
      };
    }
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
