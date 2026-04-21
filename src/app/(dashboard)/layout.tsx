import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SidebarProvider } from "@/components/layout/sidebar-context";

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

  return (
    <SidebarProvider>
      <DashboardShell
        unverifiedEmail={session.user.emailVerified ? null : session.user.email}
        needsProfile={!profile?.profileCompletedAt}
        activeOrgId={activeOrg?.id ?? null}
        activeOrgName={activeOrg?.name ?? null}
        memberships={orgList}
      >
        {children}
      </DashboardShell>
    </SidebarProvider>
  );
}
