type Props = {
  /** Top-left X */
  x: number;
  /** Top-left Y */
  y: number;
  /** Port width */
  w: number;
  /** Port height */
  h: number;
  /** Cavity color (defaults to deep black) */
  cavity?: string;
  /** Gold contact color */
  contact?: string;
  /** Outer bezel color (matches chassis tone) */
  bezel?: string;
  /** Number of contact pins (RJ45 = 8) */
  pinCount?: number;
};

/**
 * Single Ethernet jack — rectangle with rounded corners, recessed black
 * cavity, and individually rendered gold contact pins along the top
 * edge. The 8-pin detail is what sells the "real RJ45" look at hero
 * scale; at rack scale the pins blur into a gold strip.
 */
export function EthPort({
  x,
  y,
  w,
  h,
  cavity = "#0b0d10",
  contact = "#d4b366",
  bezel,
  pinCount = 8,
}: Props) {
  const radius = Math.min(w, h) * 0.18;
  const innerPad = 0.4;
  const cavityX = x + innerPad;
  const cavityY = y + innerPad;
  const cavityW = w - innerPad * 2;
  const cavityH = h - innerPad * 2;

  // Pin geometry — 8 thin rects spanning the top of the cavity
  const pinAreaPad = cavityW * 0.05;
  const pinAreaW = cavityW - pinAreaPad * 2;
  const pinAreaX = cavityX + pinAreaPad;
  const pinGap = pinAreaW / pinCount * 0.18;
  const pinW = (pinAreaW - pinGap * (pinCount - 1)) / pinCount;

  return (
    <g>
      {/* Bezel — only renders if a bezel color is provided */}
      {bezel ? (
        <rect x={x} y={y} width={w} height={h} rx={radius} fill={bezel} />
      ) : null}

      {/* Cavity */}
      <rect
        x={cavityX}
        y={cavityY}
        width={cavityW}
        height={cavityH}
        rx={radius * 0.7}
        fill={cavity}
      />

      {/* Gold contact pins along the top */}
      {Array.from({ length: pinCount }).map((_, i) => (
        <rect
          key={i}
          x={pinAreaX + i * (pinW + pinGap)}
          y={cavityY + cavityH * 0.08}
          width={pinW}
          height={cavityH * 0.22}
          fill={contact}
          opacity={0.85}
        />
      ))}

      {/* Bottom retention clip hint */}
      <rect
        x={cavityX + cavityW * 0.35}
        y={cavityY + cavityH - 0.5}
        width={cavityW * 0.3}
        height={0.4}
        rx={0.1}
        fill="#fff"
        opacity={0.06}
      />
    </g>
  );
}
