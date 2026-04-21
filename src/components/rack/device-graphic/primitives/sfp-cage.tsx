import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
};

/**
 * SFP/SFP+ uplink cages. Deeper cavities than RJ45, brand-color inset,
 * small link LED at bottom.
 */
export function SfpCage({ palette, x, y, width, height, count }: Props) {
  const gap = 0.6;
  const cageWidth = (width - gap * (count - 1)) / count;

  const cages = [];
  for (let i = 0; i < count; i++) {
    const cx = x + i * (cageWidth + gap);
    const isActive = i === 0;
    cages.push(
      <g key={i}>
        {/* Outer bezel */}
        <rect
          x={cx - 0.2}
          y={y - 0.2}
          width={cageWidth + 0.4}
          height={height + 0.4}
          fill={palette.chassisDeep}
          rx={0.8}
        />
        {/* Inner cavity */}
        <rect
          x={cx}
          y={y}
          width={cageWidth}
          height={height}
          fill={palette.cavity}
          rx={0.6}
        />
        {/* Brand inner tint (hints at "fast uplink") */}
        <rect
          x={cx + 0.6}
          y={y + 0.3}
          width={cageWidth - 1.2}
          height={0.4}
          fill={palette.primary}
          opacity={0.5}
        />
        {/* Link LED bottom-left */}
        <circle
          cx={cx + 1}
          cy={y + height - 0.8}
          r={0.5}
          fill={isActive ? palette.ledActive : palette.cavity}
          opacity={isActive ? 0.95 : 0.4}
        />
      </g>
    );
  }

  return <g>{cages}</g>;
}
