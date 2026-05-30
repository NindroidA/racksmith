"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export type CableEdgeData = {
  cableType: string;
  bandwidth: string | null;
  vlan: string | null;
  sourcePort: string;
  targetPort: string;
};

// Semantic cable colors — aligned with the brand palette (globals.css
// @theme) but kept as literal hex because @xyflow/react needs string
// stroke colors not CSS vars. Fiber stays amber-gold (it's a literal
// referent — that's the real-world jacket color of OM3/OM4 cable).
const CABLE_COLORS: Record<string, string> = {
  ethernet: "#5765f4", // primary indigo
  fiber: "#fbbf24", // amber-gold (real-world fiber jacket color — kept)
  sfp: "#22d3ee", // accent cyan
  dac: "#a674f6", // accent purple
  power: "#e63946", // accent red
  other: "#94a3b8", // slate (neutral)
};

function CableEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const d = data as unknown as CableEdgeData | undefined;
  const cableType = d?.cableType || "ethernet";
  const color = CABLE_COLORS[cableType] || CABLE_COLORS.other;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const label = d?.bandwidth
    ? `${d.bandwidth}${d.vlan ? ` · VLAN ${d.vlan}` : ""}`
    : d?.vlan
      ? `VLAN ${d.vlan}`
      : null;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? 3 : 2,
          strokeOpacity: selected ? 1 : 0.85,
          filter: selected ? `drop-shadow(0 0 6px ${color})` : undefined,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              fontFamily: "ui-monospace, monospace",
            }}
            className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white/80 backdrop-blur-sm"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const CableEdge = memo(CableEdgeInner);
export { CABLE_COLORS };
