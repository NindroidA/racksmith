import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  /** Number of ports in this group (typically 4, 6, or 8) */
  count: number;
  /** Top-left X */
  x: number;
  /** Top-left Y */
  y: number;
  /** Total block width */
  width: number;
  /** Block height */
  height: number;
  /** Tint override (e.g. PoE = warn color). Defaults to palette.primary */
  tintColor?: string;
  /** Port activity pattern — how many ports are "active" (for visual variety) */
  activeLeds?: number;
};

/**
 * One port-group block — a single rounded cavity with vertical dividers
 * hinting at individual port count. Two LEDs per group, brand-color inset stripe.
 *
 * This replaces rendering N individual port rectangles (too fiddly at rack scale).
 */
export function PortGroup({
  palette,
  count,
  x,
  y,
  width,
  height,
  tintColor,
  activeLeds = 1,
}: Props) {
  const tint = tintColor ?? palette.primary;

  // LED strip along top (above cavity)
  const ledH = height * 0.15;
  const ledY = y;

  // Cavity below LEDs
  const cavityY = y + ledH + 0.5;
  const cavityH = height - ledH - 0.5;

  // Port dividers (internal)
  const cavityPadX = 1.2;
  const cavityInner = width - cavityPadX * 2;
  const divisions = count;
  const divGap = cavityInner / divisions;

  const dividers = [];
  for (let i = 1; i < divisions; i++) {
    const dx = x + cavityPadX + i * divGap;
    dividers.push(
      <line
        key={i}
        x1={dx}
        y1={cavityY + cavityH * 0.15}
        x2={dx}
        y2={cavityY + cavityH * 0.85}
        stroke="#fff"
        strokeOpacity={0.08}
        strokeWidth={0.3}
      />
    );
  }

  // LEDs above each port pair (rounded down, min 2)
  const ledCount = Math.max(2, Math.ceil(count / 2));
  const ledGap = cavityInner / ledCount;
  const ledDotR = Math.min(ledH * 0.35, 0.9);
  const leds = [];
  for (let i = 0; i < ledCount; i++) {
    const lx = x + cavityPadX + (i + 0.5) * ledGap;
    const isActive = i < activeLeds;
    leds.push(
      <circle
        key={i}
        cx={lx}
        cy={ledY + ledH / 2}
        r={ledDotR}
        fill={isActive ? palette.ledActive : palette.cavity}
        opacity={isActive ? 0.95 : 0.45}
      />
    );
  }

  return (
    <g>
      {/* Port cavity */}
      <rect
        x={x}
        y={cavityY}
        width={width}
        height={cavityH}
        fill={palette.cavity}
        rx={1.2}
      />

      {/* Brand-color inset stripe along top of cavity */}
      <rect
        x={x + cavityPadX}
        y={cavityY + 0.3}
        width={cavityInner}
        height={0.5}
        fill={tint}
        opacity={0.55}
        rx={0.2}
      />

      {/* Port count dividers */}
      {dividers}

      {/* Jack contact hint (tiny horizontal line midway in each port) */}
      <line
        x1={x + cavityPadX + 0.5}
        y1={cavityY + cavityH * 0.6}
        x2={x + cavityPadX + cavityInner - 0.5}
        y2={cavityY + cavityH * 0.6}
        stroke={palette.chassisHi}
        strokeOpacity={0.55}
        strokeWidth={0.3}
      />

      {/* Activity LEDs */}
      {leds}
    </g>
  );
}
