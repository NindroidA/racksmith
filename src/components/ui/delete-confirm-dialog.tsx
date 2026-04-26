"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  pending?: boolean;
  /**
   * When set, the confirm button stays disabled until the user types this
   * exact string into the verification input. Used for high-blast-radius
   * deletes (e.g. organization, account).
   */
  requireTypeName?: string;
};

export function DeleteConfirmDialog({
  open,
  onClose,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
  pending = false,
  requireTypeName,
}: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const reduceMotion = useReducedMotion();
  const [typed, setTyped] = useState("");

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) {
      setTyped("");
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, pending]);

  if (typeof document === "undefined") return null;

  const typeOk = !requireTypeName || typed === requireTypeName;
  const confirmDisabled = pending || !typeOk;

  const handleConfirm = async () => {
    if (confirmDisabled) return;
    await onConfirm();
  };

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
        // Explicit opacity-only exit so Framer doesn't fall back to
        // animating `y`/`scale` (honors the reduce-motion preference).
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
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !pending && onClose()}
          role="presentation"
        >
          <motion.div
            ref={dialogRef}
            {...panelAnim}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="glass-panel w-full max-w-md overflow-hidden rounded-2xl"
          >
            <header className="flex items-start justify-between border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-red/15">
                  <AlertTriangle
                    className="h-4 w-4 text-accent-red"
                    aria-hidden
                  />
                </div>
                <h2 id={titleId} className="font-semibold text-white">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                aria-label="Close dialog"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-white/40 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <div
              id={descriptionId}
              className="space-y-4 px-5 py-4 text-sm text-white/70"
            >
              <div>{body}</div>

              {requireTypeName && (
                <div>
                  <label
                    htmlFor={`${titleId}-confirm-input`}
                    className="mb-1.5 block text-sm font-medium text-white/70"
                  >
                    Type{" "}
                    <span className="font-mono text-white">
                      {requireTypeName}
                    </span>{" "}
                    to confirm
                  </label>
                  <input
                    id={`${titleId}-confirm-input`}
                    type="text"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && typeOk && !pending) {
                        e.preventDefault();
                        handleConfirm();
                      }
                    }}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-1p-ignore
                    className="glass-input w-full rounded-lg px-4 py-2.5 font-mono text-sm"
                    aria-invalid={!typeOk && typed.length > 0}
                    aria-describedby={`${titleId}-confirm-hint`}
                  />
                  <p
                    id={`${titleId}-confirm-hint`}
                    aria-live="polite"
                    className="mt-1 min-h-[1em] text-xs text-accent-red"
                  >
                    {typed.length > 0 && !typeOk
                      ? `Doesn't match. Type exactly: ${requireTypeName}`
                      : ""}
                  </p>
                </div>
              )}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-white/[0.08] px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="glass-button rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirmDisabled}
                aria-busy={pending}
                className="rounded-lg border border-accent-red/30 bg-accent-red/15 px-4 py-1.5 text-sm font-medium text-accent-red transition-colors hover:bg-accent-red/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/50 disabled:opacity-40"
              >
                {pending ? "Deleting..." : confirmLabel}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
