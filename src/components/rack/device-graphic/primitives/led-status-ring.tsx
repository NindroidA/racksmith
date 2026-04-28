import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  /** Center x in viewBox units */
  cx: number;
  /** Center y in viewBox units */
  cy: number;
  /** Outer radius (ring + bezel) */
  r: number;
  /** Number of arc segments around the ring (default 24) */
  segments?: number;
  /** Fraction of segments lit (0–1, default 1 = all lit) */
  litFraction?: number;
  /** Show a small "active" dot at the center */
  showCenterDot?: boolean;
};

/**
 * UDM-Pro signature LED status ring — a thin segmented circle that the user's
 * eye locks onto first when looking at the front panel. Segments are drawn as
 * short arcs; "lit" ones use the brand primary, dim ones fall back to the
 * cavity color. The component renders the bezel + ring + optional center dot;
 * placement (left-of-touchscreen) is the caller's job.
 */
export function LedStatusRing({
  palette,
  cx,
  cy,
  r,
  segments = 24,
  litFraction = 1,
  showCenterDot = true,
}: Props) {
  const ringInner = r * 0.78;
  const ringOuter = r * 0.96;
  const segGap = (Math.PI * 2) / segments;
  const segArc = segGap * 0.62;
  const litCount = Math.round(segments * Math.max(0, Math.min(1, litFraction)));

  const segs: React.ReactNode[] = [];
  for (let i = 0; i < segments; i++) {
    const a0 = i * segGap - Math.PI / 2;
    const a1 = a0 + segArc;
    const x0o = cx + ringOuter * Math.cos(a0);
    const y0o = cy + ringOuter * Math.sin(a0);
    const x1o = cx + ringOuter * Math.cos(a1);
    const y1o = cy + ringOuter * Math.sin(a1);
    const x0i = cx + ringInner * Math.cos(a1);
    const y0i = cy + ringInner * Math.sin(a1);
    const x1i = cx + ringInner * Math.cos(a0);
    const y1i = cy + ringInner * Math.sin(a0);
    const lit = i < litCount;
    segs.push(
      <path
        key={`seg-${i}`}
        d={`M ${x0o} ${y0o} A ${ringOuter} ${ringOuter} 0 0 1 ${x1o} ${y1o} L ${x0i} ${y0i} A ${ringInner} ${ringInner} 0 0 0 ${x1i} ${y1i} Z`}
        fill={lit ? palette.primary : palette.cavity}
        opacity={lit ? 0.9 : 0.55}
      />,
    );
  }

  return (
    <g>
      {/* Bezel — slight inset disc */}
      <circle cx={cx} cy={cy} r={r} fill={palette.chassisDeep} />
      <circle cx={cx} cy={cy} r={r * 0.99} fill={palette.cavity} opacity={0.7} />
      {segs}
      {/* Inner well — keeps the ring readable */}
      <circle cx={cx} cy={cy} r={ringInner * 0.92} fill={palette.cavity} />
      {showCenterDot && (
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.22}
          fill={palette.ledActive}
          opacity={0.85}
        />
      )}
    </g>
  );
}
