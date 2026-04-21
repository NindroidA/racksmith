import type { BrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { BrandBadge } from "../primitives/brand-badge";
import { LcdPanel } from "../primitives/lcd-panel";

type Props = {
  palette: BrandPalette;
  sizeU: number;
  outletCount?: number;
  model?: string;
  /** Show amperage LCD display (metered PDU) */
  metered?: boolean;
};

/**
 * PDU faceplate — outlet receptacles in a row, power breaker,
 * optional amperage LCD. Horizontal TrippLite / APC style.
 */
export function PduFaceplate({
  palette,
  sizeU,
  outletCount = 8,
  model,
  metered = false,
}: Props) {
  const w = 500;
  const h = 46 * Math.max(1, sizeU);
  const earW = 10;

  // If metered: LCD on left showing load amperage
  const lcdW = metered ? 60 : 0;
  const lcdX = earW + 6;
  const lcdY = h * 0.2;
  const lcdH = h * 0.6;

  // Main breaker + LED cluster (left side)
  const breakerX = metered ? lcdX + lcdW + 8 : earW + 6;
  const breakerW = 22;
  const breakerY = h * 0.25;
  const breakerH = h * 0.5;

  // Outlets region
  const outletsX = breakerX + breakerW + 8;
  const outletsW = w - earW - 6 - outletsX;
  const outletGap = 2;
  const outletW = (outletsW - outletGap * (outletCount - 1)) / outletCount;
  const outletY = h * 0.22;
  const outletH = Math.min(h * 0.56, outletW * 0.9);
  const outletRadius = outletH * 0.4;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}
      role="img"
      aria-label={`PDU, ${outletCount} outlets, ${sizeU}U`}
    >
      <ChassisFrame palette={palette} w={w} h={h} />

      {/* Optional metered LCD */}
      {metered && (
        <LcdPanel
          palette={palette}
          x={lcdX}
          y={lcdY}
          width={lcdW}
          height={lcdH}
          primaryText="8.2A"
          secondaryText="LOAD"
          tint="#34d399"
          primarySize={Math.min(lcdH * 0.42, 12)}
        />
      )}

      {/* Main breaker toggle */}
      <g>
        <rect
          x={breakerX}
          y={breakerY}
          width={breakerW}
          height={breakerH}
          fill={palette.chassisDeep}
          rx={2}
        />
        {/* Toggle switch */}
        <rect
          x={breakerX + 3}
          y={breakerY + breakerH * 0.15}
          width={breakerW - 6}
          height={breakerH * 0.45}
          fill={palette.chassisHi}
          stroke={palette.chassisDeep}
          strokeWidth={0.4}
          rx={1.5}
        />
        {/* Power LED */}
        <circle
          cx={breakerX + breakerW / 2}
          cy={breakerY + breakerH * 0.78}
          r={1.1}
          fill={palette.ledActive}
          opacity={0.9}
        />
        <text
          x={breakerX + breakerW / 2}
          y={breakerY + breakerH + 1.5}
          fontSize={2.1}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#fff"
          opacity={0.45}
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="0.05em"
        >
          PWR
        </text>
      </g>

      {/* Outlet receptacles — rounded squares with NEMA 5-15 pattern hint */}
      {Array.from({ length: outletCount }, (_, i) => {
        const ox = outletsX + i * (outletW + outletGap);
        return (
          <g key={i}>
            {/* Outlet face */}
            <rect
              x={ox}
              y={outletY}
              width={outletW}
              height={outletH}
              fill={palette.chassisDeep}
              rx={outletRadius * 0.4}
            />
            {/* Inner bezel */}
            <rect
              x={ox + 0.6}
              y={outletY + 0.6}
              width={outletW - 1.2}
              height={outletH - 1.2}
              fill={palette.cavity}
              rx={outletRadius * 0.3}
            />
            {/* Two vertical slots (NEMA plug-prong hint) */}
            <rect
              x={ox + outletW * 0.32}
              y={outletY + outletH * 0.22}
              width={outletW * 0.06}
              height={outletH * 0.32}
              fill={palette.chassis}
              rx={0.2}
            />
            <rect
              x={ox + outletW * 0.62}
              y={outletY + outletH * 0.22}
              width={outletW * 0.06}
              height={outletH * 0.32}
              fill={palette.chassis}
              rx={0.2}
            />
            {/* Ground hole (round) */}
            <circle
              cx={ox + outletW * 0.5}
              cy={outletY + outletH * 0.72}
              r={outletW * 0.08}
              fill={palette.chassis}
            />
          </g>
        );
      })}

      {/* Brand wordmark bottom-right */}
      <BrandBadge
        palette={palette}
        x={w - earW - 3}
        y={h - 5}
        height={4}
        anchor="end"
        size={3.8}
      />

      {model && (
        <text
          x={earW + 3}
          y={h - 3}
          fontSize={2}
          fontFamily="ui-monospace, monospace"
          fill="#fff"
          opacity={0.3}
        >
          {model}
        </text>
      )}
    </svg>
  );
}
