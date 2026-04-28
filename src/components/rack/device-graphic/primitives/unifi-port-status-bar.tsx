import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  x: number;
  y: number;
  width: number;
  /** Bar height (typically 0.7–1.0 viewBox units — kept thin) */
  height?: number;
  /** Number of LED dots along the bar (default 24, capped at 64) */
  ledCount?: number;
  /** Fraction of LEDs lit (0–1, default 0.7) */
  litFraction?: number;
};

/**
 * The signature thin LED accent strip along the bottom edge of UniFi rack-
 * mount switches. Different from the chassis `accentStripe` (which is a
 * solid brand-color line at the top) — this one sits just inside the
 * bottom bezel and shows per-port-ish status dots, contributing to the
 * UniFi "alive" feel even when no ports are explicitly drawn.
 */
export function UnifiPortStatusBar({
  palette,
  x,
  y,
  width,
  height = 0.8,
  ledCount = 24,
  litFraction = 0.7,
}: Props) {
  const count = Math.max(1, Math.min(64, ledCount));
  const litCount = Math.round(count * Math.max(0, Math.min(1, litFraction)));
  const dotR = Math.min(height * 0.42, width / count / 3);
  const stride = width / count;

  return (
    <g>
      {/* Bar background — subtle dark groove */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={palette.cavity}
        opacity={0.55}
        rx={height / 2}
      />
      {/* Brand accent tint underneath the dots */}
      <rect
        x={x + 0.3}
        y={y + height * 0.25}
        width={width - 0.6}
        height={height * 0.5}
        fill={palette.primary}
        opacity={0.18}
        rx={height / 4}
      />
      {/* Per-port LED dots */}
      {Array.from({ length: count }).map((_, i) => {
        const cx = x + stride / 2 + i * stride;
        const cy = y + height / 2;
        const lit = i < litCount;
        return (
          <circle
            key={`uled-${i}`}
            cx={cx}
            cy={cy}
            r={dotR}
            fill={lit ? palette.primary : palette.cavity}
            opacity={lit ? 0.85 : 0.55}
          />
        );
      })}
    </g>
  );
}
