type Props = {
  cx: number;
  cy: number;
  /** Hole radius */
  r?: number;
  /** Cavity color (the hole itself) */
  cavity?: string;
  /** 3D highlight dot color */
  highlight?: string;
};

/**
 * Single rack-ear mounting hole with a 3D specular highlight dot
 * offset slightly from center. The highlight is what sells "this is
 * a real round hole punched into metal" rather than a flat circle.
 *
 * Use in rack ears at the four corners (top-left, top-right,
 * bottom-left, bottom-right) for the canonical 1U/2U mounting hole
 * pattern, or in the middle for vertical alignment indicators.
 */
export function RackEarHole({
  cx,
  cy,
  r = 1,
  cavity = "#0b0d10",
  highlight = "#ffffff",
}: Props) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={cavity} />
      <circle
        cx={cx - r * 0.3}
        cy={cy - r * 0.3}
        r={r * 0.22}
        fill={highlight}
        opacity={0.35}
      />
    </g>
  );
}
