import Link from "next/link";
import { CreditCard, FileText } from "lucide-react";
import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getUsageSummary } from "@/lib/tiers";
import { isRole, roleHasAccess, type Role } from "@/lib/permissions";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { TwoFactorSection } from "./two-factor-section";
import { PreferencesSection } from "./preferences-section";
import { UsageSection } from "./usage-section";
import { DangerSection } from "./danger-section";
import { OrganizationSection } from "./organization-section";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { session, organizationId, role } = await requireMember("member");
  const params = await searchParams;
  const focusOrganization = params.tab === "organization";

  const [settings, usage, organization, members, invitations, pendingTransfer] =
    await Promise.all([
      prisma.userSettings.findUnique({ where: { userId: session.user.id } }),
      getUsageSummary(organizationId),
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, slug: true, plan: true },
      }),
      prisma.member.findMany({
        where: { organizationId },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.invitation.findMany({
        where: { organizationId, status: "pending" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      prisma.ownershipTransfer.findFirst({
        where: { organizationId, status: "pending" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          expiresAt: true,
          toUser: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-white/60">
          Manage your account, security, and preferences.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <ProfileSection
          initialName={session.user.name}
          email={session.user.email}
          emailVerified={session.user.emailVerified}
        />

        {organization && (
          <OrganizationSection
            organization={organization}
            viewerRole={role}
            viewerUserId={session.user.id}
            members={members.map((m) => ({
              id: m.id,
              role: isRole(m.role) ? m.role : "viewer",
              joinedAt: m.createdAt,
              user: m.user,
            }))}
            invitations={invitations}
            pendingTransfer={pendingTransfer}
            scrollIntoView={focusOrganization}
          />
        )}

        <SecuritySection currentSessionId={session.session.id} />

        <TwoFactorSection
          initialEnabled={Boolean(
            (session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled,
          )}
        />

        <UsageSection usage={usage} />

        <PreferencesSection
          initial={{
            defaultSubnet: settings?.defaultSubnet ?? "",
            scanInterval: settings?.scanInterval ?? null,
            sidebarCollapsed: settings?.sidebarCollapsed ?? false,
          }}
        />

        {roleHasAccess(role, "admin") && (
          <Link
            href="/settings/billing"
            className="glass-card flex items-center justify-between rounded-xl p-6 transition-colors hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <div className="text-base font-semibold text-white">
                  Billing
                </div>
                <div className="text-sm text-white/50">
                  Manage your subscription, payment method, and invoices.
                </div>
              </div>
            </div>
            <span className="text-sm text-white/40">Manage →</span>
          </Link>
        )}

        <Link
          href="/settings/audit"
          className="glass-card flex items-center justify-between rounded-xl p-6 transition-colors hover:bg-white/[0.04]"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <div className="text-base font-semibold text-white">
                Audit log
              </div>
              <div className="text-sm text-white/50">
                Every change made to your account, racks, devices, and topology.
              </div>
            </div>
          </div>
          <span className="text-sm text-white/40">View →</span>
        </Link>

        <DangerSection email={session.user.email} />
      </div>
    </div>
  );
}
