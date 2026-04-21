import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Columns of vent dots */
  cols?: number;
  /** Rows of vent dots */
  rows?: number;
};

/**
 * Subtle vent-hole pattern for authentic chassis feel.
 * Real rack gear has vent holes everywhere — adding a hint makes the chassis
 * feel solid rather than a pure flat rectangle.
 */
export function VentGrille({
  palette,
  x,
  y,
  width,
  height,
  cols = 12,
  rows = 3,
}: Props) {
  const dotR = Math.min(width / cols, height / rows) * 0.22;
  const spaceX = width / cols;
  const spaceY = height / rows;

  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <circle
          key={`${r}-${c}`}
          cx={x + spaceX * (c + 0.5)}
          cy={y + spaceY * (r + 0.5)}
          r={dotR}
          fill={palette.cavity}
          opacity={0.55}
        />
      );
    }
  }

  return <g>{dots}</g>;
}
