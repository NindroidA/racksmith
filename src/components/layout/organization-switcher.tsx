"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { twMerge } from "tailwind-merge";
import toast from "react-hot-toast";
import {
  Check,
  ChevronsUpDown,
  Plus,
  Settings as SettingsIcon,
} from "lucide-react";
import { setActiveOrganization } from "@/app/(dashboard)/settings/actions";

export type OrgMembership = {
  id: string;
  name: string;
  role: string;
};

type Props = {
  collapsed: boolean;
  activeOrgId: string;
  activeOrgName: string;
  memberships: OrgMembership[];
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function OrganizationSwitcher({
  collapsed,
  activeOrgId,
  activeOrgName,
  memberships,
}: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  // Mixed array — workspace rows render as `<button>`, the create + settings
  // rows render as `<Link>` (which forwards a ref to `<a>`). Both implement
  // HTMLElement.focus(), which is all the keyboard handler needs.
  const itemsRef = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>(
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const switchTo = (orgId: string) => {
    if (orgId === activeOrgId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const result = await setActiveOrganization(orgId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success("Workspace switched");
      router.refresh();
    });
  };

  const handleMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = itemsRef.current.filter(
      (el): el is HTMLButtonElement | HTMLAnchorElement => el !== null,
    );
    if (items.length === 0) return;
    const idx = items.findIndex((el) => el === document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = items[(idx + 1) % items.length] ?? items[0];
      next.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev =
        items[(idx - 1 + items.length) % items.length] ??
        items[items.length - 1];
      prev.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1].focus();
    }
  };

  const triggerLabel = collapsed ? initials(activeOrgName) : activeOrgName;
  const dropdownAnim = reduceMotion
    ? { initial: false, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: -4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
      };

  return (
    <div ref={containerRef} className="relative px-3">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={pending}
        aria-label={
          collapsed
            ? `Workspace: ${activeOrgName}. Open switcher.`
            : "Switch workspace"
        }
        title={collapsed ? activeOrgName : undefined}
        className={twMerge(
          "flex w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50",
          collapsed && "justify-center px-0",
        )}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/20 text-[10px] font-semibold text-primary"
          aria-hidden
        >
          {initials(activeOrgName)}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left">
              {triggerLabel}
            </span>
            <ChevronsUpDown
              className="h-3.5 w-3.5 shrink-0 text-white/40"
              aria-hidden
            />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            {...dropdownAnim}
            transition={{ duration: 0.12 }}
            role="menu"
            aria-label="Workspaces"
            onKeyDown={handleMenuKey}
            className={twMerge(
              "absolute z-50 mt-1.5 max-h-[60vh] overflow-auto rounded-xl border border-white/[0.18] bg-surface-raised py-1.5 shadow-[0_16px_64px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]",
              collapsed ? "left-full ml-2 top-0 w-56" : "left-3 right-3",
            )}
          >
            <div
              className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/40"
              role="presentation"
            >
              Workspaces
            </div>
            {memberships.map((m, i) => {
              const isActive = m.id === activeOrgId;
              return (
                <button
                  key={m.id}
                  ref={(el) => {
                    itemsRef.current[i] = el;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => switchTo(m.id)}
                  disabled={pending}
                  className={twMerge(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-blue/50 disabled:opacity-50",
                    isActive ? "text-white" : "text-white/70",
                  )}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/[0.06] text-[9px] font-semibold text-white/70"
                    aria-hidden
                  >
                    {initials(m.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/30">
                    {m.role}
                  </span>
                  {isActive && (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-primary"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
            <div
              className="my-1 border-t border-white/[0.06]"
              role="separator"
            />
            <Link
              ref={(el) => {
                itemsRef.current[memberships.length] = el;
              }}
              href="/settings?tab=organization&action=create"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-blue/50"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Create organization
            </Link>
            <Link
              ref={(el) => {
                itemsRef.current[memberships.length + 1] = el;
              }}
              href="/settings?tab=organization"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-blue/50"
            >
              <SettingsIcon className="h-4 w-4" aria-hidden />
              Workspace settings
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
