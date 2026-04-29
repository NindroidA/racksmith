type Props = {
  cx: number;
  cy: number;
  /** Core LED radius. The bloom extends ~3× this. */
  r: number;
  /** LED color (hex/hsl). Soft halo derives from this. */
  color: string;
  /** Optional opacity multiplier (default 1) — for "off" or dimmed states */
  intensity?: number;
};

/**
 * Soft 4-stop LED with surrounding bloom. Renders as four concentric
 * circles: a wide soft halo, a medium halo, a tight halo, and the
 * solid core. Reads as "lit" without harsh edges.
 *
 * Use everywhere a status LED appears — port activity, system health,
 * power indicators. The 4-stop stack is what sells the soft-glow
 * aesthetic of the v2 art direction.
 */
export function LedBloom({ cx, cy, r, color, intensity = 1 }: Props) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 3.0} fill={color} opacity={0.08 * intensity} />
      <circle cx={cx} cy={cy} r={r * 2.0} fill={color} opacity={0.18 * intensity} />
      <circle cx={cx} cy={cy} r={r * 1.35} fill={color} opacity={0.45 * intensity} />
      <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.95 * intensity} />
    </g>
  );
}
