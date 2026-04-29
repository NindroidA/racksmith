import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Show "MODE" + "MASTER" labels (default true) */
  showLabels?: boolean;
};

/**
 * Cisco's secondary button stack — the small "MODE" / "MASTER" pair that
 * sits next to the system status column on Catalyst 9300/9200L. Different
 * concept from the existing `CiscoStatusColumn` primitive (which renders
 * the SYST/RPS/STAT/DUPLX/SPEED/STACK LEDs + a single big MODE button);
 * this one is the smaller paired button cluster used when both buttons
 * need to render side-by-side rather than stacked.
 */
export function CiscoModeButtons({
  palette,
  x,
  y,
  width,
  height,
  showLabels = true,
}: Props) {
  const btnH = height * 0.55;
  const btnW = (width - 1) / 2;
  const labelH = showLabels ? height * 0.3 : 0;
  const btnY = y + (height - btnH - labelH) / 2;

  const buttons = [
    { x: x, label: "MODE" },
    { x: x + btnW + 1, label: "MASTER" },
  ];

  return (
    <g>
      {buttons.map((b) => (
        <g key={b.label}>
          <rect
            x={b.x}
            y={btnY}
            width={btnW}
            height={btnH}
            fill={palette.chassisHi}
            stroke={palette.chassisDeep}
            strokeWidth={0.25}
            rx={0.6}
          />
          {/* Subtle button highlight */}
          <rect
            x={b.x + 0.3}
            y={btnY + 0.3}
            width={btnW - 0.6}
            height={btnH * 0.3}
            fill="#fff"
            opacity={0.06}
            rx={0.4}
          />
          {showLabels && (
            <text
              x={b.x + btnW / 2}
              y={btnY + btnH + labelH / 2}
              fontSize={Math.min(labelH * 0.6, 1.8)}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fill="#fff"
              opacity={0.55}
              textAnchor="middle"
              dominantBaseline="middle"
              letterSpacing="0.05em"
            >
              {b.label}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}
