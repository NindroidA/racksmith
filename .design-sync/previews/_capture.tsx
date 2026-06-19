// Preview-only helpers — NEVER shipped in the importable bundle (these live only
// in the preview .tsx files the capture harness compiles).
//
// 1) Reduced-motion shim: the capture harness runs a frozen clock, which freezes
//    framer-motion ENTER animations at opacity:0 — so a modal's open state would
//    screenshot blank. Forcing prefers-reduced-motion makes those components skip
//    the enter animation and render at their final frame.
// 2) <DarkBackdrop>: body-portaled overlays (Dialog, TemplateGallery) escape the
//    preview frame, so this lays the Amethyst base behind them the way the real app
//    does (instead of the harness's white page).
import * as React from "react";
import { MotionGlobalConfig } from "racksmith";

// Render all framer-motion animations at their final frame. The capture harness
// runs a frozen clock, which otherwise freezes enter animations (e.g. the template
// gallery's opacity fade) at opacity:0. This mutates the bundle's framer-motion
// instance (reached via the re-export above) — preview-only; the shipped bundle
// never sets this, so real designs keep their animations.
try {
  (MotionGlobalConfig as { skipAnimations?: boolean }).skipAnimations = true;
} catch {
  /* MotionGlobalConfig unavailable — fall back to the reduced-motion shim below */
}

if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  const mm = window.matchMedia.bind(window);
  window.matchMedia = ((q: string) =>
    /prefers-reduced-motion/.test(q)
      ? {
          matches: true,
          media: q,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent: () => false,
        }
      : mm(q)) as typeof window.matchMedia;
}

export const DarkBackdrop = () => (
  <div style={{ position: "fixed", inset: 0, background: "#0e0b1c" }} aria-hidden />
);
