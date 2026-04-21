"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type Item = { id: string; name: string; blurb: string };

type Props<T extends Item> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  items: T[];
  renderPreview?: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  submittingId?: string | null;
  emptyMessage?: string;
};

export function TemplateGallery<T extends Item>({
  open,
  onOpenChange,
  title,
  subtitle,
  items,
  renderPreview,
  onSelect,
  submittingId,
  emptyMessage = "No templates available.",
}: Props<T>) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          role="presentation"
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gallery-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl outline-none"
          >
            <header className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-6">
              <div>
                <h2
                  id="gallery-title"
                  className="text-xl font-semibold text-white"
                >
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-1 text-sm text-white/50">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close template gallery"
                className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <div className="overflow-y-auto p-6">
              {items.length === 0 ? (
                <p className="text-center text-sm text-white/50">
                  {emptyMessage}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {items.map((item) => {
                    const submitting = submittingId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelect(item)}
                        disabled={!!submittingId}
                        className={twMerge(
                          "glass-card group flex flex-col items-stretch rounded-xl p-4 text-left transition-all",
                          "disabled:cursor-wait disabled:opacity-60",
                        )}
                      >
                        {renderPreview && (
                          <div className="mb-3 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02]">
                            {renderPreview(item)}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-white">
                            {item.name}
                          </h3>
                          {submitting && (
                            <span className="text-xs text-white/50">
                              Creating…
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-white/50">
                          {item.blurb}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
