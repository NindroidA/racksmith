"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type SidebarState = {
  /** Desktop rail collapsed↔expanded (md+). */
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
  /** Mobile off-canvas drawer open↔closed (<md). */
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
};

const SidebarCtx = createContext<SidebarState>({
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

const STORAGE_KEY = "racksmith:sidebar-collapsed";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsedState(true);
    } catch {
      // ignore — SSR or disabled storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "true" : "false");
    } catch {
      // ignore
    }
  }, [collapsed, hydrated]);

  const value: SidebarState = {
    collapsed,
    setCollapsed: setCollapsedState,
    toggle: () => setCollapsedState(!collapsed),
    mobileOpen,
    setMobileOpen,
  };

  return <SidebarCtx.Provider value={value}>{children}</SidebarCtx.Provider>;
}

export function useSidebar() {
  return useContext(SidebarCtx);
}
