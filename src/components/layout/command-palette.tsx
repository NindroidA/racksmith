"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  SquaresFour,
  Stack,
  HardDrives,
  ShareNetwork,
  Broadcast,
  GearSix,
  Plus,
  MagnifyingGlass,
  UploadSimple,
  SignOut,
  ClockCounterClockwise,
  Calculator,
  Globe,
  Tag,
  FileCode,
  MagicWand,
  BatteryCharging,
  PlugsConnected,
  Bell,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { signOut } from "@/lib/auth-client";
import { describeError } from "@/lib/error-message";

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: Icon;
  group: "Navigate" | "Create" | "Account";
  run: () => void | Promise<void>;
  keywords?: string[];
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, dialogRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  const actions = useMemo<Action[]>(
    () => [
      {
        id: "nav-dashboard",
        label: "Go to Dashboard",
        hint: "/dashboard",
        icon: SquaresFour,
        group: "Navigate",
        run: () => router.push("/dashboard"),
        keywords: ["home", "overview"],
      },
      {
        id: "nav-racks",
        label: "Go to Racks",
        hint: "/racks",
        icon: Stack,
        group: "Navigate",
        run: () => router.push("/racks"),
      },
      {
        id: "nav-devices",
        label: "Go to Devices",
        hint: "/devices",
        icon: HardDrives,
        group: "Navigate",
        run: () => router.push("/devices"),
      },
      {
        id: "nav-topology",
        label: "Go to Topology",
        hint: "/topology",
        icon: ShareNetwork,
        group: "Navigate",
        run: () => router.push("/topology"),
      },
      {
        id: "nav-discovery",
        label: "Go to Discovery",
        hint: "/discovery",
        icon: Broadcast,
        group: "Navigate",
        run: () => router.push("/discovery"),
      },
      {
        id: "nav-subnet-calc",
        label: "Open Subnet Calculator",
        hint: "/network-tools/subnet-calc",
        icon: Calculator,
        group: "Navigate",
        keywords: ["cidr", "vlsm", "mask"],
        run: () => router.push("/network-tools/subnet-calc"),
      },
      {
        id: "nav-ipam",
        label: "Open IPAM",
        hint: "/ipam",
        icon: Globe,
        group: "Navigate",
        keywords: ["subnet", "ip", "dhcp"],
        run: () => router.push("/ipam"),
      },
      {
        id: "nav-vlans",
        label: "Open VLANs",
        hint: "/network-tools/vlans",
        icon: Tag,
        group: "Navigate",
        keywords: ["trunk", "802.1q", "tag"],
        run: () => router.push("/network-tools/vlans"),
      },
      {
        id: "nav-config-gen",
        label: "Open Config Generator",
        hint: "/network-tools/config-gen",
        icon: FileCode,
        group: "Navigate",
        keywords: ["cisco", "ios", "unifi", "aruba", "hpe"],
        run: () => router.push("/network-tools/config-gen"),
      },
      {
        id: "nav-plan-wizard",
        label: "Open Plan Wizard",
        hint: "/plan-wizard",
        icon: MagicWand,
        group: "Navigate",
        keywords: ["plan", "wizard", "design", "blueprint", "build"],
        run: () => router.push("/plan-wizard"),
      },
      {
        id: "nav-power",
        label: "Open Power budget",
        hint: "/network-tools/power",
        icon: BatteryCharging,
        group: "Navigate",
        keywords: ["poe", "pdu", "ups", "battery", "watts"],
        run: () => router.push("/network-tools/power"),
      },
      {
        id: "nav-cables",
        label: "Open Cable estimator",
        hint: "/network-tools/cables",
        icon: PlugsConnected,
        group: "Navigate",
        keywords: ["fiber", "cat6", "length", "bom"],
        run: () => router.push("/network-tools/cables"),
      },
      {
        id: "nav-recommendations",
        label: "Open Recommendations",
        hint: "/network-tools/recommendations",
        icon: Bell,
        group: "Navigate",
        keywords: ["alerts", "warnings", "capacity", "health"],
        run: () => router.push("/network-tools/recommendations"),
      },
      {
        id: "nav-settings",
        label: "Go to Settings",
        hint: "/settings",
        icon: GearSix,
        group: "Navigate",
        run: () => router.push("/settings"),
      },
      {
        id: "nav-audit",
        label: "View audit log",
        hint: "/settings/audit",
        icon: ClockCounterClockwise,
        group: "Navigate",
        run: () => router.push("/settings/audit"),
        keywords: ["activity", "history", "events"],
      },
      {
        id: "create-rack",
        label: "New rack",
        hint: "/racks/new",
        icon: Plus,
        group: "Create",
        run: () => router.push("/racks/new"),
      },
      {
        id: "create-device",
        label: "New device",
        hint: "/devices/new",
        icon: Plus,
        group: "Create",
        run: () => router.push("/devices/new"),
      },
      {
        id: "create-subnet",
        label: "New subnet",
        hint: "/ipam/new",
        icon: Plus,
        group: "Create",
        run: () => router.push("/ipam/new"),
      },
      {
        id: "create-vlan",
        label: "New VLAN",
        hint: "/network-tools/vlans/new",
        icon: Plus,
        group: "Create",
        run: () => router.push("/network-tools/vlans/new"),
      },
      {
        id: "create-build-plan",
        label: "New build plan",
        hint: "/plan-wizard/new",
        icon: Plus,
        group: "Create",
        keywords: ["wizard", "design", "blueprint"],
        run: () => router.push("/plan-wizard/new"),
      },
      {
        id: "create-discovery",
        label: "Run discovery scan",
        hint: "/discovery",
        icon: MagnifyingGlass,
        group: "Create",
        run: () => router.push("/discovery"),
      },
      {
        id: "import-devices",
        label: "Import devices from CSV",
        hint: "/devices/import",
        icon: UploadSimple,
        group: "Create",
        run: () => router.push("/devices/import"),
      },
      {
        id: "account-signout",
        label: "Sign out",
        icon: SignOut,
        group: "Account",
        run: async () => {
          try {
            await signOut();
          } catch (err) {
            const { default: toast } = await import("react-hot-toast");
            toast.error(describeError(err, "Failed to sign out"));
          }
        },
      },
    ],
    [router],
  );

  const groups = useMemo(() => {
    const map = new Map<Action["group"], Action[]>();
    for (const a of actions) {
      const arr = map.get(a.group) ?? [];
      arr.push(a);
      map.set(a.group, arr);
    }
    return Array.from(map.entries());
  }, [actions]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={close}
          role="presentation"
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 p-4 pt-[20vh] backdrop-blur-sm"
        >
          <motion.div
            ref={dialogRef}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="glass-panel w-full max-w-xl overflow-hidden rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cmd-palette-label"
          >
            <Command loop className="flex flex-col">
              <span id="cmd-palette-label" className="sr-only">
                Command palette
              </span>
              <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
                <MagnifyingGlass
                  className="h-4 w-4 shrink-0 text-white/40"
                  weight="bold"
                  aria-hidden
                />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Type a command or search…"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                />
                <Kbd>esc</Kbd>
              </div>

              <Command.List className="max-h-[60vh] overflow-y-auto px-2 py-2">
                <Command.Empty className="px-3 py-8 text-center text-sm text-white/50">
                  No matches.
                </Command.Empty>

                {groups.map(([group, items]) => (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-white/40"
                  >
                    {items.map((a) => {
                      const Icon = a.icon;
                      return (
                        <Command.Item
                          key={a.id}
                          value={[a.label, a.hint, ...(a.keywords ?? [])]
                            .filter(Boolean)
                            .join(" ")}
                          onSelect={() => {
                            void a.run();
                            close();
                          }}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-white/80 transition-colors data-[selected=true]:bg-white/[0.08] data-[selected=true]:text-white"
                        >
                          <Icon
                            className="h-4 w-4 shrink-0 text-white/50"
                            weight="duotone"
                            aria-hidden
                          />
                          <span className="flex-1">{a.label}</span>
                          {a.hint && (
                            <span className="text-xs text-white/30">
                              {a.hint}
                            </span>
                          )}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
              </Command.List>

              <footer className="flex items-center justify-between border-t border-white/[0.08] px-4 py-2 text-[11px] text-white/40">
                <span className="flex items-center gap-2">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  <span>navigate</span>
                </span>
                <span className="flex items-center gap-2">
                  <Kbd>↵</Kbd>
                  <span>select</span>
                </span>
              </footer>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-white/15 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] font-medium text-white/60">
      {children}
    </kbd>
  );
}
