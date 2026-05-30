"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { twMerge } from "tailwind-merge";
import {
  Gauge,
  Stack,
  HardDrives,
  ShareNetwork,
  Pulse,
  GearSix,
  CaretLeft,
  CaretRight,
  SignOut,
  Wrench,
  Calculator,
  Globe,
  Tag,
  FileCode,
  MagicWand,
  BatteryCharging,
  PlugsConnected,
  Bell,
} from "@phosphor-icons/react/dist/ssr";
import { signOut } from "@/lib/auth-client";
import { useSidebar } from "./sidebar-context";
import {
  OrganizationSwitcher,
  type OrgMembership,
} from "./organization-switcher";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Gauge;
  group?: string;
};

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/racks", label: "Racks", icon: Stack },
  { href: "/devices", label: "Devices", icon: HardDrives },
  { href: "/topology", label: "Topology", icon: ShareNetwork },
  { href: "/discovery", label: "Discovery", icon: Pulse },
  // IPAM and Plan Wizard are full features (own data models, server actions,
  // recommendation integrations) — promoted out of the Network Tools
  // calculator bucket to top-level peers of Racks/Devices/Topology.
  { href: "/ipam", label: "IPAM", icon: Globe },
  { href: "/plan-wizard", label: "Plan Wizard", icon: MagicWand },
  {
    href: "/network-tools/subnet-calc",
    label: "Subnet Calc",
    icon: Calculator,
    group: "Network Tools",
  },
  {
    href: "/network-tools/vlans",
    label: "VLANs",
    icon: Tag,
    group: "Network Tools",
  },
  {
    href: "/network-tools/config-gen",
    label: "Config Gen",
    icon: FileCode,
    group: "Network Tools",
  },
  {
    href: "/network-tools/power",
    label: "Power",
    icon: BatteryCharging,
    group: "Network Tools",
  },
  {
    href: "/network-tools/cables",
    label: "Cables",
    icon: PlugsConnected,
    group: "Network Tools",
  },
  {
    href: "/network-tools/recommendations",
    label: "Recommendations",
    icon: Bell,
    group: "Network Tools",
  },
  { href: "/settings", label: "Settings", icon: GearSix },
] as const;

type SidebarProps = {
  activeOrgId: string | null;
  activeOrgName: string | null;
  memberships: OrgMembership[];
};

export function Sidebar({
  activeOrgId,
  activeOrgName,
  memberships,
}: SidebarProps) {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  // When the user prefers reduced motion, skip the sliding/fading label
  // transitions on collapse/expand and let the labels appear/disappear
  // instantly. The `width` animation is what vestibular-sensitive users
  // most need blocked — opacity alone is within the "safe" category.
  const labelAnim = reduceMotion
    ? { initial: false, animate: { opacity: 1, width: "auto" } }
    : {
        initial: { opacity: 0, width: 0 },
        animate: { opacity: 1, width: "auto" },
        exit: { opacity: 0, width: 0 },
      };

  return (
    <aside
      className={twMerge(
        "glass-sidebar fixed left-0 top-0 z-40 flex h-screen flex-col transition-[width] duration-300",
        collapsed ? "w-[72px]" : "w-[240px]",
      )}
    >
      {/* Collapse Tab Handle — sticks out from the right edge, slides further out on hover */}
      <button
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="group absolute right-[-18px] top-1/2 z-50 flex h-14 w-[22px] -translate-y-1/2 items-center justify-center rounded-r-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
      >
        <span
          aria-hidden
          className={twMerge(
            "pointer-events-none absolute inset-y-0 left-0 flex w-[18px] items-center justify-center rounded-r-xl",
            "bg-gradient-to-r from-[#0f1423] to-[#141829]",
            "border-y border-r border-white/[0.12]",
            "shadow-[4px_0_16px_rgba(0,0,0,0.45),inset_-1px_0_0_rgba(255,255,255,0.04)]",
            "transition-[background,border-color] duration-200 ease-out",
            "group-hover:from-[#141829] group-hover:to-[#1a1f35] group-hover:border-white/25",
          )}
        >
          {collapsed ? (
            <CaretRight
              weight="bold"
              className="h-3.5 w-3.5 text-white/50 transition-colors group-hover:text-white/90"
            />
          ) : (
            <CaretLeft
              weight="bold"
              className="h-3.5 w-3.5 text-white/50 transition-colors group-hover:text-white/90"
            />
          )}
        </span>
      </button>

      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/15 ring-1 ring-inset ring-primary/25">
          <Wrench weight="duotone" className="h-5 w-5 text-primary" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              {...labelAnim}
              className="gradient-text overflow-hidden whitespace-nowrap text-lg font-bold"
            >
              RackSmith
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Workspace switcher */}
      {activeOrgId && activeOrgName && (
        <div className="mt-2 shrink-0">
          <OrganizationSwitcher
            collapsed={collapsed}
            activeOrgId={activeOrgId}
            activeOrgName={activeOrgName}
            memberships={memberships}
          />
        </div>
      )}

      {/* Navigation */}
      <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-2">
        {NAV_ITEMS.map((item, idx) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          const prevGroup = idx > 0 ? NAV_ITEMS[idx - 1].group : undefined;
          const showHeader =
            !collapsed && item.group && item.group !== prevGroup;

          return (
            <div key={item.href}>
              {showHeader && (
                <div className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  {item.group}
                </div>
              )}
              <Link
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={twMerge(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50",
                  isActive
                    ? "bg-primary/15 text-white"
                    : "text-white/60 hover:bg-white/[0.06] hover:text-white/90",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-primary/15"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                {/* Instrument-panel left accent on the active item. */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 z-10 h-5 w-[2px] -translate-y-1/2 rounded-full bg-primary"
                  />
                )}
                <Icon
                  weight="duotone"
                  className={twMerge(
                    "relative z-10 h-5 w-5 shrink-0",
                    isActive ? "text-primary" : "",
                  )}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      {...labelAnim}
                      className="relative z-10 overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          onClick={() => signOut()}
          title={collapsed ? "Sign Out" : undefined}
          aria-label={collapsed ? "Sign Out" : undefined}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-all duration-200 hover:bg-white/[0.06] hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
        >
          <SignOut weight="duotone" className="h-5 w-5 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                {...labelAnim}
                className="overflow-hidden whitespace-nowrap"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </aside>
  );
}
