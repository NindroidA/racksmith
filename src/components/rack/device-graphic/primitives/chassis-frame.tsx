import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  /** viewBox width (use 500 for all devices) */
  w: number;
  /** viewBox height (46 × sizeU) */
  h: number;
  /** Include brand accent stripe along top */
  accentStripe?: boolean;
};

/**
 * Flat, minimal chassis with subtle top-light gradient, rack ears, and an
 * optional brand accent stripe along the top edge.
 *
 * Follows art-direction.md: rounded corners, minimal luminance range,
 * single mounting-hole hint per ear.
 */
export function ChassisFrame({ palette, w, h, accentStripe = true }: Props) {
  const earW = 10;
  const bodyX = earW;
  const bodyW = w - earW * 2;
  const radius = 4;

  // Unique id per palette so multiple instances don't collide
  const gradId = `chassis-${palette.chassis.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <g>
      {/* Subtle drop shadow for "floating" feel */}
      <rect
        x={bodyX}
        y={h - 0.8}
        width={bodyW}
        height={3}
        fill="#000"
        opacity={0.4}
        rx={radius}
      />

      {/* Rack ears (flat, no fake rivets — just one hole centered) */}
      <rect x={0} y={0} width={earW} height={h} fill={palette.chassisDeep} rx={1} />
      <rect x={w - earW} y={0} width={earW} height={h} fill={palette.chassisDeep} rx={1} />
      <circle cx={earW / 2} cy={h / 2} r={1} fill={palette.cavity} opacity={0.8} />
      <circle cx={w - earW / 2} cy={h / 2} r={1} fill={palette.cavity} opacity={0.8} />

      {/* Chassis body with very subtle top-light gradient */}
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.chassisHi} />
          <stop offset="100%" stopColor={palette.chassisDeep} />
        </linearGradient>
      </defs>
      <rect
        x={bodyX}
        y={0}
        width={bodyW}
        height={h}
        fill={`url(#${gradId})`}
        rx={radius}
      />

      {/* Crisp top highlight for extra sheen */}
      <rect
        x={bodyX + 1}
        y={0.4}
        width={bodyW - 2}
        height={0.4}
        fill="#fff"
        opacity={0.12}
      />

      {/* Brand accent stripe along the top — the signature visual */}
      {accentStripe && (
        <rect
          x={bodyX + 3}
          y={1.5}
          width={bodyW - 6}
          height={1}
          fill={palette.primary}
          opacity={0.8}
          rx={0.5}
        />
      )}
    </g>
  );
}
