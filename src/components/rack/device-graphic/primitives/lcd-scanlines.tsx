type Props = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Scanline color — typically a very faint white or the LCD's ink color */
  ink?: string;
  /** Per-line opacity (default 0.06 — barely visible up close) */
  opacity?: number;
  /** Pixel-grid pitch in viewBox units (default 0.7) */
  pitch?: number;
};

/**
 * Faint horizontal scanlines overlay for LCD surfaces. Renders one
 * thin line every `pitch` units. At rack scale the lines blur into a
 * subtle texture; at hero scale they read as the screen-grid that
 * makes a digital LCD look real.
 *
 * Place over an LCD background fill, before any text/numerals so the
 * scanlines don't cover the readout.
 */
export function LcdScanlines({
  x,
  y,
  w,
  h,
  ink = "#ffffff",
  opacity = 0.06,
  pitch = 0.7,
}: Props) {
  const lineCount = Math.floor(h / pitch);
  return (
    <g>
      {Array.from({ length: lineCount }).map((_, i) => (
        <rect
          key={i}
          x={x}
          y={y + i * pitch}
          width={w}
          height={pitch * 0.4}
          fill={ink}
          opacity={opacity}
        />
      ))}
    </g>
  );
}
