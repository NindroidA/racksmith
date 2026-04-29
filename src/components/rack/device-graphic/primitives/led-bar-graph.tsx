type Props = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Value 0–100 — fraction of segments lit */
  value: number;
  /** Number of segments (default 10) */
  segments?: number;
  /** Background segment color when unlit */
  off?: string;
  /** Lit color for segments in the lower 75% of the bar (segment-position based, not value-based) */
  safe?: string;
  /** Lit color for segments in the 75–90% region of the bar */
  warn?: string;
  /** Lit color for segments above 90% of the bar */
  alarm?: string;
};

/**
 * Discrete N-segment LED bar graph — typically used as a UPS load
 * indicator or amperage meter. Lights segments left-to-right based on
 * `value` (0–100), with color shifting from green → amber → red as
 * load climbs. Lit segments get a thin white highlight along the top
 * to sell the "lit" feel.
 *
 * Defaults to 10 segments with safe ≤75%, warn 75–90%, alarm >90%.
 */
export function LedBarGraph({
  x,
  y,
  w,
  h,
  value,
  segments = 10,
  off = "#1a1d24",
  safe = "#5fd08b",
  warn = "#f5b04f",
  alarm = "#ec5757",
}: Props) {
  const safeSegs = Math.max(1, Math.floor(segments));
  const clamped = Math.max(0, Math.min(100, value));
  // Floor (not round) so that e.g. value=75 with 10 segments lights 7
  // segments and the 8th (warn-threshold) only lights when value > 75.
  const litCount = Math.floor((clamped / 100) * safeSegs);
  const gap = w * 0.012;
  const segW = (w - gap * (safeSegs - 1)) / safeSegs;

  const colorFor = (i: number): string => {
    const pct = ((i + 1) / safeSegs) * 100;
    if (pct > 90) return alarm;
    if (pct > 75) return warn;
    return safe;
  };

  return (
    <g>
      {Array.from({ length: safeSegs }).map((_, i) => {
        const sx = x + i * (segW + gap);
        const lit = i < litCount;
        return (
          <g key={i}>
            <rect
              x={sx}
              y={y}
              width={segW}
              height={h}
              rx={Math.min(segW, h) * 0.18}
              fill={lit ? colorFor(i) : off}
              opacity={lit ? 0.95 : 0.7}
            />
            {/* Lit segments get a thin highlight along the top */}
            {lit && (
              <rect
                x={sx + segW * 0.15}
                y={y + h * 0.12}
                width={segW * 0.7}
                height={h * 0.12}
                rx={segW * 0.1}
                fill="#ffffff"
                opacity={0.4}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
