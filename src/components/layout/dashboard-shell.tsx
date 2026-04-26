"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { Sidebar } from "./sidebar";
import { useSidebar } from "./sidebar-context";
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
};

export function DashboardShell({
  children,
  unverifiedEmail,
  needsProfile = false,
  activeOrgId,
  activeOrgName,
  memberships,
}: Props) {
  const { collapsed } = useSidebar();
  const router = useRouter();
  const [quizOpen, setQuizOpen] = useState(needsProfile);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeOrgId={activeOrgId}
        activeOrgName={activeOrgName}
        memberships={memberships}
      />
      <main
        aria-label="Page content"
        className={twMerge(
          "flex-1 p-8 transition-[margin] duration-300",
          collapsed ? "ml-[72px]" : "ml-[240px]",
        )}
      >
        {unverifiedEmail && <VerifyEmailBanner email={unverifiedEmail} />}
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
