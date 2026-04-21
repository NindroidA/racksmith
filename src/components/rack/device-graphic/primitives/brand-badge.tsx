import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  x: number;
  y: number;
  /** Height of badge area (vertically centered) */
  height: number;
  /** Alignment — "start" anchors left at x, "middle" centers at x, "end" right-aligns */
  anchor?: "start" | "middle" | "end";
  /** Font size in viewBox units */
  size?: number;
};

/**
 * Brand wordmark — abstract typographic mark, never a real logo.
 * Prominent sticker-like placement per art-direction.md.
 */
export function BrandBadge({
  palette,
  x,
  y,
  height,
  anchor = "start",
  size,
}: Props) {
  if (!palette.brandText) return null;

  const fontSize = size ?? Math.min(height * 0.9, 10);

  return (
    <text
      x={x}
      y={y + height / 2}
      fontSize={fontSize}
      fontWeight={700}
      fontFamily="ui-sans-serif, system-ui, -apple-system, 'SF Pro Display', sans-serif"
      fill={palette.primary}
      textAnchor={anchor}
      dominantBaseline="middle"
      letterSpacing={palette.brandTracking ?? "0"}
      opacity={0.95}
      style={{ userSelect: "none" }}
    >
      {palette.brandText}
    </text>
  );
}
