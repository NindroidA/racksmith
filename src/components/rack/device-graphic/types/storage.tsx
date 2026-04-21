import type { BrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { LcdPanel } from "../primitives/lcd-panel";
import { BrandBadge } from "../primitives/brand-badge";

type Props = {
  palette: BrandPalette;
  sizeU: number;
  bayRows?: number;
  bayCols?: number;
  driveForm?: "2.5in" | "3.5in";
  populated?: number;
  model?: string;
  manufacturer?: string;
};

/**
 * Storage array — denser drive bay grid than a server, often 24+ bays.
 * Management LCD on right, redundant controller indicator, dense bay layout.
 * Dell PowerVault / NetApp FAS style.
 */
export function StorageFaceplate({
  palette,
  sizeU,
  bayRows,
  bayCols,
  driveForm = "2.5in",
  populated = 0.85,
  model,
  manufacturer,
}: Props) {
  const w = 500;
  const h = 46 * sizeU;
  const earW = 10;

  // Storage arrays pack more bays than servers — denser grids
  const rows = bayRows ?? (sizeU >= 2 ? 2 : 1);
  const cols = bayCols ?? (driveForm === "2.5in" ? 12 : 6);

  const bayPadX = 3;
  const bayPadY = h * 0.1;
  const bayAreaX = earW + bayPadX;
  const bayAreaY = bayPadY;
  const bayAreaW = (w - earW * 2) * 0.8 - bayPadX;
  const bayAreaH = h - bayPadY - h * 0.18;

  const bayGap = 1;
  const bayW = (bayAreaW - bayGap * (cols - 1)) / cols;
  const bayH = (bayAreaH - bayGap * (rows - 1)) / rows;

  // Control region (right 20%)
  const ctrlX = earW + (w - earW * 2) * 0.8 + bayPadX;
  const ctrlW = w - earW - ctrlX - 3;

  const bays = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = bayAreaX + c * (bayW + bayGap);
      const by = bayAreaY + r * (bayH + bayGap);
      const idx = r * cols + c;
      const isPopulated = idx / (rows * cols) < populated;

      bays.push(
        <g key={`${r}-${c}`}>
          <rect
            x={bx}
            y={by}
            width={bayW}
            height={bayH}
            fill={palette.chassisDeep}
            rx={1}
          />
          {isPopulated ? (
            <g>
              <rect
                x={bx + 0.5}
                y={by + 0.5}
                width={bayW - 1}
                height={bayH - 1}
                fill={palette.chassis}
                rx={0.6}
              />
              {/* Drive label stripe */}
              <rect
                x={bx + bayW * 0.15}
                y={by + bayH * 0.35}
                width={bayW * 0.55}
                height={bayH * 0.2}
                fill={palette.cavity}
                opacity={0.55}
                rx={0.3}
              />
              {/* Activity LED */}
              <circle
                cx={bx + bayW - 1.2}
                cy={by + bayH - 1.2}
                r={0.5}
                fill={idx % 3 === 0 ? palette.ledActive : palette.primary}
                opacity={0.85}
              />
            </g>
          ) : (
            <rect
              x={bx + 0.8}
              y={by + 0.8}
              width={bayW - 1.6}
              height={bayH - 1.6}
              fill={palette.cavity}
              opacity={0.7}
              rx={0.4}
            />
          )}
        </g>
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}
      role="img"
      aria-label={`${manufacturer || ""} storage array, ${rows * cols} bays, ${sizeU}U`}
    >
      <ChassisFrame palette={palette} w={w} h={h} />

      {/* Drive bays */}
      <g>{bays}</g>

      {/* Control panel LCD + dual controller indicators */}
      <LcdPanel
        palette={palette}
        x={ctrlX}
        y={bayAreaY}
        width={ctrlW}
        height={bayAreaH * 0.55}
        primaryText="SAN"
        secondaryText={model ? model.toUpperCase() : ""}
        primarySize={Math.min(bayAreaH * 0.24, 9)}
      />

      {/* Dual controller status LEDs */}
      <g>
        {["CTL-A", "CTL-B"].map((label, i) => {
          const cy = bayAreaY + bayAreaH * 0.65 + i * (bayAreaH * 0.14);
          return (
            <g key={label}>
              <circle
                cx={ctrlX + ctrlW * 0.15}
                cy={cy}
                r={1.1}
                fill={palette.ledActive}
                opacity={0.9}
              />
              <text
                x={ctrlX + ctrlW * 0.3}
                y={cy}
                fontSize={2.2}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fill="#fff"
                opacity={0.5}
                dominantBaseline="middle"
                letterSpacing="0.05em"
              >
                {label}
              </text>
            </g>
          );
        })}
      </g>

      {/* Bottom bezel strip */}
      <rect
        x={earW + 2}
        y={h - h * 0.14}
        width={w - earW * 2 - 4}
        height={h * 0.1}
        fill={palette.chassisDeep}
        opacity={0.35}
        rx={1}
      />

      {/* Brand wordmark centered bottom */}
      <BrandBadge
        palette={palette}
        x={w / 2}
        y={h - h * 0.09}
        height={h * 0.07}
        anchor="middle"
        size={Math.min(h * 0.1, 8)}
      />
    </svg>
  );
}
