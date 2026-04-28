"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type DialogSize = "sm" | "md" | "lg" | "xl";

type Props = {
  open: boolean;
  onClose: () => void;
  /** ID of the heading element inside the dialog body — consumer provides. */
  labelledBy: string;
  /** ID of a description element inside the dialog body — consumer provides. */
  describedBy?: string;
  /** Use "alertdialog" for destructive confirms; defaults to "dialog". */
  role?: "dialog" | "alertdialog";
  /** Width preset; defaults to "md". */
  size?: DialogSize;
  /**
   * When true, ESC key + backdrop click are no-ops. Use during an in-flight
   * request so the user can't dismiss mid-mutation.
   */
  pending?: boolean;
  /** Stacking context. Bump (e.g. 80) when nesting on top of another dialog. */
  zIndex?: number;
  children: ReactNode;
};

const SIZE_CLASS: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

/**
 * Modal-dialog primitive. Owns:
 *   - portal into document.body
 *   - backdrop (with reduce-motion-aware fade)
 *   - focus trap on the panel
 *   - return-focus to the opener when closed
 *   - ESC to close (skipped while `pending`)
 *   - backdrop click to close (skipped while `pending`)
 *   - aria-modal + role + labelledby + describedby wiring
 *
 * Consumer renders header / body / footer markup as `children` so each
 * call site can theme the chrome (e.g. alertdialog uses an AlertTriangle
 * header, ip-assignment shows a subnet subtitle). The primitive doesn't
 * presume a header layout.
 *
 * Skips Escape when the event has `defaultPrevented` set — lets nested
 * controls (like `<Select>` listboxes) consume the keypress for their
 * own dismiss without unintentionally closing the dialog.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  role = "dialog",
  size = "md",
  pending = false,
  zIndex = 60,
  children,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Captures the element that triggered the open so focus returns there on
  // close. The capture must beat useFocusTrap's effect — that effect runs
  // useEffect-class, so a useLayoutEffect here fires synchronously after
  // commit and before any useEffect, including useFocusTrap's. Capturing
  // in useEffect (or *after* useFocusTrap) would record an element inside
  // the panel that the trap had already focused — never the opener.
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  useFocusTrap(open, panelRef);

  useLayoutEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    return () => {
      // On unmount or close, hand focus back to the opener if it's still in
      // the document. Use a microtask to defer until DOM mutations from
      // the exit animation have settled.
      const target = returnFocusRef.current;
      if (target && document.contains(target)) {
        queueMicrotask(() => target.focus({ preventScroll: true }));
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, pending]);

  if (typeof document === "undefined") return null;

  const backdropAnim = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
  const panelAnim = reduceMotion
    ? {
        initial: false,
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 12, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 12, scale: 0.97 },
      };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          {...backdropAnim}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          style={{ zIndex }}
          onClick={() => !pending && onClose()}
          role="presentation"
        >
          <motion.div
            ref={panelRef}
            {...panelAnim}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            role={role}
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            className={`glass-panel w-full overflow-hidden rounded-2xl ${SIZE_CLASS[size]}`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
