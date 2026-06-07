"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { List, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { twMerge } from "tailwind-merge";
import { Sidebar } from "./sidebar";
import { useSidebar } from "./sidebar-context";
import { PaymentStatusBanner } from "./payment-status-banner";
import { VerifyEmailBanner } from "./verify-email-banner";
import type { OrgMembership } from "./organization-switcher";
import { CommandPalette } from "@/components/layout/command-palette";
import { ProfileQuiz } from "@/components/onboarding/profile-quiz";

type Props = {
  children: ReactNode;
  unverifiedEmail?: string | null;
  needsProfile?: boolean;
  activeOrgId: string | null;
  activeOrgName: string | null;
  memberships: OrgMembership[];
  paymentBanner?: { planLabel: string } | null;
};

export function DashboardShell({
  children,
  unverifiedEmail,
  needsProfile = false,
  activeOrgId,
  activeOrgName,
  memberships,
  paymentBanner,
}: Props) {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [quizOpen, setQuizOpen] = useState(needsProfile);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeOrgId={activeOrgId}
        activeOrgName={activeOrgName}
        memberships={memberships}
      />

      {/* Mobile top app-bar — hidden on md+ where the persistent rail shows. */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-1 border-b border-white/10 bg-[#0e0b1c]/90 px-2 backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55"
        >
          <List weight="bold" className="h-5 w-5" />
        </button>
        <span className="gradient-text text-base font-bold">RackSmith</span>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("racksmith:command-palette"))
          }
          aria-label="Search and commands"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55"
        >
          <MagnifyingGlass weight="bold" className="h-5 w-5" />
        </button>
      </header>

      {/* Drawer backdrop (mobile only). */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <main
        aria-label="Page content"
        className={twMerge(
          "flex-1 px-4 pb-8 pt-[72px] transition-[margin] duration-300 md:p-8",
          collapsed ? "md:ml-[72px]" : "md:ml-[240px]",
        )}
      >
        {unverifiedEmail && <VerifyEmailBanner email={unverifiedEmail} />}
        {paymentBanner && (
          <PaymentStatusBanner planLabel={paymentBanner.planLabel} />
        )}
        {children}
      </main>
      <CommandPalette />
      <ProfileQuiz
        open={quizOpen}
        onClose={() => {
          setQuizOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
