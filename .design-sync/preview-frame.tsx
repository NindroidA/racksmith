// design-sync preview frame. RackSmith's Forge components are built for the dark
// Amethyst body (`html { background: #0e0b1c }`), but the preview harness forces a
// white page. This provider wraps every preview cell in the Amethyst base so the
// light-text / translucent-glass variants (secondary buttons, glass inputs, muted
// labels) render the way they do in the real app. Wired via cfg.provider; merged
// into the bundle via cfg.extraEntries. minHeight:100% fills full-bleed story
// captures while staying compact in the multi-cell grid card.
import * as React from "react";

// Re-exported so preview files can reach the SAME framer-motion instance the
// components use (see _capture.tsx). Harmless in the shipped bundle — it's a
// framer-motion config object, not a DS component, and gets no component card.
export { MotionGlobalConfig } from "framer-motion";

export function ForgePreview({ children }: { children?: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#0e0b1c",
        minHeight: "100%",
        padding: "32px",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}
