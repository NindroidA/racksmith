"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { twMerge } from "tailwind-merge";

type Props = {
  label?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

export function AdvancedAccordion({
  label = "Advanced options",
  defaultOpen = false,
  children,
  className,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const reduced = useReducedMotion();
  const duration = reduced ? 0 : 0.2;
  const chevronDuration = reduced ? 0 : 0.15;

  return (
    <div
      className={twMerge("rounded-lg border border-white/[0.08]", className)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
      >
        <span>{label}</span>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: chevronDuration, ease: "easeOut" }}
          className="text-white/40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-white/[0.06] px-4 py-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
