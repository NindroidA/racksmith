"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );

    // Prefer an element marked with `autofocus` so callers like
    // ApiKeyCreateDialog can land focus on the name input instead of the
    // close button (the first focusable in tab order).
    const autofocusEl = container.querySelector<HTMLElement>("[autofocus]");
    if (autofocusEl?.offsetParent != null) {
      autofocusEl.focus({ preventScroll: true });
    } else {
      getFocusable()[0]?.focus({ preventScroll: true });
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = getFocusable();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKey);
    return () => container.removeEventListener("keydown", onKey);
  }, [active, containerRef]);
}
