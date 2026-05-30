"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Wrench } from "@phosphor-icons/react/dist/ssr";

type Props = {
  /**
   * Page-specific subtitle below the "RackSmith" brand mark. Omit for
   * pages whose body provides its own heading (e.g. verify-email's
   * success/error states).
   */
  title?: string;
  children: ReactNode;
};

/**
 * Glass-panel chrome shared by every (auth) page: brand mark + reduce-motion
 * fade-in + rounded glass card. Auth pages render their form/state UI as
 * children. Pulled out of (auth)/login, register, forgot-password,
 * reset-password, two-factor-verify, verify-email — six near-identical
 * shells that drifted slightly across copy and were a maintenance hazard.
 */
export function AuthShell({ title, children }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
    >
      <div className="glass-panel rounded-2xl p-8">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <Wrench
              className="h-7 w-7 text-primary"
              aria-hidden
              weight="duotone"
            />
          </div>
          <p className="gradient-text text-2xl font-bold">RackSmith</p>
          {title && (
            <h1 className="mt-1 text-sm font-normal text-white/50">{title}</h1>
          )}
        </div>
        {children}
      </div>
    </motion.div>
  );
}
