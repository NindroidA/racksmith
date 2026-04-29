import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Single-line readout on the LCD (e.g. service tag, "iDRAC OK") */
  readout?: string;
};

/**
 * Dell PowerEdge front-bezel LCD — small amber-backlit display that lives
 * on the far-left of the bezel and shows status / service-tag info. Visually
 * distinct from the existing `LcdPanel` primitive: narrower aspect, amber
 * tint instead of brand-tinted glow, more "industrial readout" than "info
 * dashboard."
 *
 * Caller positions it so the LCD sits in the leftmost ~10–15% of the bezel,
 * with the drive bay grid filling the rest.
 */
export function DellLcdPanel({
  palette,
  x,
  y,
  width,
  height,
  readout,
}: Props) {
  const bezel = 0.6;
  const sx = x + bezel;
  const sy = y + bezel;
  const sw = width - bezel * 2;
  const sh = height - bezel * 2;

  // Dell's bezel LCDs are amber-backlit on most PowerEdge generations.
  // Hard-coded amber tint here (rather than palette.primary) is the
  // signature; brand chassis color still comes from palette.
  const amber = "#d99543";

  return (
    <g>
      {/* Bezel surround */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={palette.chassisDeep}
        rx={0.8}
      />
      {/* Screen base — almost-black backlit panel */}
      <rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        fill="#0a0807"
        rx={0.4}
      />
      {/* Amber backlight glow */}
      <rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        fill={amber}
        opacity={0.18}
        rx={0.4}
      />
      {/* Subtle scanline */}
      <rect
        x={sx}
        y={sy + sh / 2}
        width={sw}
        height={0.12}
        fill="#fff"
        opacity={0.07}
      />
      {readout && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          fontSize={Math.min(sh * 0.55, 2.6)}
          fontWeight={600}
          fontFamily="ui-monospace, 'SF Mono', monospace"
          fill={amber}
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="0.12em"
          opacity={0.95}
        >
          {readout}
        </text>
      )}
    </g>
  );
}
