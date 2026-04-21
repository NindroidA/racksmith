import type { BrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { VentGrille } from "../primitives/vent-grille";
import { BrandBadge } from "../primitives/brand-badge";

type Props = {
  palette: BrandPalette;
  sizeU: number;
  deviceType?: string;
  model?: string;
};

/**
 * Fallback faceplate for unknown / blank-panel / brush-panel / other.
 * Minimal chassis with a type label centered — "you're looking at a filler panel."
 */
export function OtherFaceplate({
  palette,
  sizeU,
  deviceType,
  model,
}: Props) {
  const w = 500;
  const h = 46 * sizeU;
  const earW = 10;

  const label = deviceType
    ? deviceType.replace(/_/g, " ").toUpperCase()
    : "BLANK";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}
      role="img"
      aria-label={`${label}, ${sizeU}U`}
    >
      <ChassisFrame palette={palette} w={w} h={h} accentStripe={false} />

      {/* Thin separator line */}
      <rect
        x={earW + 4}
        y={h * 0.45}
        width={w - (earW + 4) * 2}
        height={0.3}
        fill={palette.chassisHi}
        opacity={0.5}
      />

      {/* Scattered vent holes for "blank but breathing" feel */}
      <VentGrille
        palette={palette}
        x={w * 0.25}
        y={h * 0.3}
        width={w * 0.5}
        height={h * 0.4}
        cols={10}
        rows={Math.max(2, sizeU * 2)}
      />

      {/* Type label */}
      <text
        x={w / 2}
        y={h * 0.22}
        fontSize={Math.min(h * 0.2, 6)}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight={600}
        fill="#fff"
        opacity={0.4}
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing="0.15em"
      >
        {label}
      </text>

      {/* Model */}
      {model && (
        <BrandBadge
          palette={palette}
          x={w / 2}
          y={h - h * 0.2}
          height={h * 0.12}
          anchor="middle"
          size={Math.min(h * 0.14, 6)}
        />
      )}
    </svg>
  );
}
