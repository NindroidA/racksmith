import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  x: number;
  y: number;
  width: number;
  height: number;
  /** "blank" → slot cover only; "sfp" → 4×SFP+ cages drawn inside */
  variant?: "blank" | "sfp";
  /** Number of SFP cages when variant=sfp (default 4) */
  sfpCount?: number;
};

/**
 * The Cisco 9300-series modular uplink slot — a separate dark rectangle on
 * the right third of the chassis that ships either with a "BLANK" cover or
 * a 4×SFP+ uplink module. The split between port region and uplink slot is
 * the visual cue that the chassis is a 9300 (vs the unified port row of a
 * 9200L).
 */
export function ModularUplinkSlot({
  palette,
  x,
  y,
  width,
  height,
  variant = "sfp",
  sfpCount = 4,
}: Props) {
  const bezel = 0.6;
  const innerX = x + bezel;
  const innerY = y + bezel;
  const innerW = width - bezel * 2;
  const innerH = height - bezel * 2;

  return (
    <g>
      {/* Outer bezel — visually separates the modular slot from the chassis */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={palette.chassisDeep}
        rx={1.2}
      />
      <rect
        x={innerX}
        y={innerY}
        width={innerW}
        height={innerH}
        fill={palette.cavity}
        rx={0.6}
      />

      {variant === "blank" && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          fontSize={Math.min(height * 0.32, 4)}
          fontWeight={600}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#fff"
          opacity={0.35}
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="0.15em"
        >
          BLANK
        </text>
      )}

      {variant === "sfp" && sfpCount > 0 && (
        <g>
          {Array.from({ length: sfpCount }).map((_, i) => {
            const cageGap = 1;
            const cageW = (innerW - cageGap * (sfpCount + 1)) / sfpCount;
            const cageH = innerH * 0.7;
            const cx = innerX + cageGap + i * (cageW + cageGap);
            const cy = innerY + (innerH - cageH) / 2;
            return (
              <g key={`u-cage-${i}`}>
                <rect
                  x={cx}
                  y={cy}
                  width={cageW}
                  height={cageH}
                  fill={palette.chassisDeep}
                  rx={0.4}
                />
                <rect
                  x={cx + 0.4}
                  y={cy + 0.4}
                  width={cageW - 0.8}
                  height={cageH - 0.8}
                  fill={palette.primary}
                  opacity={0.18}
                  rx={0.3}
                />
                <circle
                  cx={cx + 1}
                  cy={cy + cageH - 0.8}
                  r={0.3}
                  fill={palette.ledActive}
                  opacity={0.85}
                />
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
}
