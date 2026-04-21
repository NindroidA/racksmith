import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Text shown on touchscreen (default: "UI") */
  label?: string;
  /** Subtitle (tiny, below main) */
  sublabel?: string;
};

/**
 * UniFi's signature touch screen — the distinctive 1.3" color LCD.
 * Square-ish aspect, bright blue UI accent, "adopted" status ring.
 *
 * This is THE thing that makes a UniFi switch instantly recognizable.
 */
export function UnifiTouchscreen({
  palette,
  x,
  y,
  width,
  height,
  label = "UI",
  sublabel,
}: Props) {
  const bezel = 1;
  const sx = x + bezel;
  const sy = y + bezel;
  const sw = width - bezel * 2;
  const sh = height - bezel * 2;

  // Use the smaller dimension for square-ish feel
  const size = Math.min(sw, sh);

  const uid = `unifi-${Math.floor(x * 1000 + y)}`;

  return (
    <g>
      {/* Outer bezel with rounded corners (more rounded than rectangular LCDs) */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={palette.chassisDeep}
        rx={2.5}
      />

      {/* Inner screen with UI gradient (blue glow signature) */}
      <defs>
        <radialGradient id={uid} cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor={palette.primary} stopOpacity={0.35} />
          <stop offset="55%" stopColor={palette.primary} stopOpacity={0.15} />
          <stop offset="100%" stopColor="#0a1320" stopOpacity={0.8} />
        </radialGradient>
      </defs>

      <rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        fill="#0a1320"
        rx={1.8}
      />
      <rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        fill={`url(#${uid})`}
        rx={1.8}
      />

      {/* Thin "adopted" status ring — subtle UniFi blue border inside screen */}
      <rect
        x={sx + 0.5}
        y={sy + 0.5}
        width={sw - 1}
        height={sh - 1}
        fill="none"
        stroke={palette.primary}
        strokeOpacity={0.55}
        strokeWidth={0.35}
        rx={1.5}
      />

      {/* Primary "UI" text — large, confident */}
      <text
        x={x + width / 2}
        y={y + height * (sublabel ? 0.42 : 0.52)}
        fontSize={Math.min(size * 0.45, 11)}
        fontWeight={800}
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        fill="#dbe7ff"
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing="0.05em"
      >
        {label}
      </text>

      {sublabel && (
        <text
          x={x + width / 2}
          y={y + height * 0.72}
          fontSize={Math.min(size * 0.18, 4)}
          fontFamily="ui-monospace, monospace"
          fill={palette.primary}
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="0.12em"
          opacity={0.75}
        >
          {sublabel}
        </text>
      )}

      {/* Screen glare — subtle diagonal highlight */}
      <polygon
        points={`${sx},${sy} ${sx + sw * 0.45},${sy} ${sx + sw * 0.1},${sy + sh * 0.35} ${sx},${sy + sh * 0.15}`}
        fill="#fff"
        opacity={0.05}
      />
    </g>
  );
}
