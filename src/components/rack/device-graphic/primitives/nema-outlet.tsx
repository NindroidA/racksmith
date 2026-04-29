type Props = {
  cx: number;
  cy: number;
  /** Outer bezel size (the outlet is roughly square — 1.05:1 tall) */
  size: number;
  /** Bezel color (matches chassis tone) */
  bezel?: string;
  /** Recessed inner-face color (slightly darker than bezel) */
  face?: string;
  /** Cavity color (the actual slots/ground hole — typically deep black) */
  cavity?: string;
  /** Stroke color around the bezel */
  stroke?: string;
  /** Highlight color for tiny specular details */
  highlight?: string;
  /** Status indicator — undefined/true = active green, false = off */
  active?: boolean;
  /** Active LED color */
  activeColor?: string;
  /** Off LED color */
  offColor?: string;
};

/**
 * NEMA 5-15R receptacle — the standard American 120V outlet. Renders
 * as a "happy face":
 *   - Two vertical slots (eyes) — neutral on the left (slightly taller
 *     and wider, matches real NEMA 5-15R geometry), hot on the right
 *   - Smile-D ground hole below — flat top, curve below, taller than
 *     wide so it reads as a proper "D" rather than a half-circle
 *   - Tiny status LED above the slots
 *
 * Size 20 viewBox units works well at 1U PDU rack scale; the
 * proportions scale linearly so larger sizes for detailed previews
 * still look right.
 */
export function NemaOutlet({
  cx,
  cy,
  size,
  bezel = "#cdd2dc",
  face = "#a4abb8",
  cavity = "#0b0d10",
  stroke = "#5b6273",
  highlight = "#e9ecf2",
  active = true,
  activeColor = "#5fd08b",
  offColor = "#2a2e36",
}: Props) {
  const w = size;
  const h = size * 1.05;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const slotW = w * 0.075;
  const slotH = h * 0.26;
  const slotGap = w * 0.18;
  const slotsCenterY = y + h * 0.34;

  // Smile-D ground geometry — taller than wide so the mouth doesn't
  // read squished
  const groundCx = cx;
  const groundCy = y + h * 0.62;
  const groundRx = w * 0.1;
  const groundRy = w * 0.17;

  return (
    <g>
      {/* Outer bezel — rounded square that sits proud of the chassis */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={w * 0.28}
        fill={bezel}
        stroke={stroke}
        strokeWidth={0.35}
      />
      {/* Faint top highlight on bezel */}
      <rect
        x={x + w * 0.2}
        y={y + 0.15}
        width={w * 0.6}
        height={0.5}
        rx={w * 0.2}
        fill={highlight}
        opacity={0.18}
      />
      {/* Recessed inner face */}
      <rect
        x={x + w * 0.12}
        y={y + h * 0.1}
        width={w * 0.76}
        height={h * 0.8}
        rx={w * 0.2}
        fill={face}
      />
      {/* Inner top recess shadow (sells depth) */}
      <rect
        x={x + w * 0.12}
        y={y + h * 0.1}
        width={w * 0.76}
        height={0.5}
        rx={w * 0.2}
        fill="#000"
        opacity={0.3}
      />
      {/* Neutral slot (left, taller and slightly wider) */}
      <rect
        x={cx - slotGap / 2 - slotW * 1.05}
        y={slotsCenterY - slotH / 2 - 0.25}
        width={slotW * 1.1}
        height={slotH + 0.5}
        rx={slotW * 0.3}
        fill={cavity}
      />
      {/* Hot slot (right, shorter) */}
      <rect
        x={cx + slotGap / 2}
        y={slotsCenterY - slotH / 2}
        width={slotW}
        height={slotH}
        rx={slotW * 0.3}
        fill={cavity}
      />
      {/* GROUND — sideways D / smile shape (flat top, curve below) */}
      <path
        d={`M ${groundCx - groundRx},${groundCy} L ${groundCx + groundRx},${groundCy} A ${groundRx},${groundRy} 0 0 1 ${groundCx - groundRx},${groundCy} Z`}
        fill={cavity}
      />
      {/* Tiny highlight along the flat top of the D (sells the smile) */}
      <rect
        x={groundCx - groundRx * 0.85}
        y={groundCy - 0.05}
        width={groundRx * 1.7}
        height={0.18}
        fill={highlight}
        opacity={0.22}
      />
      {/* Per-outlet status LED above the slots */}
      <circle
        cx={cx}
        cy={y + h * 0.16}
        r={0.4}
        fill={active ? activeColor : offColor}
        opacity={0.95}
      />
    </g>
  );
}
