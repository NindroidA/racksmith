import type { BrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { LcdPanel } from "../primitives/lcd-panel";
import { VentGrille } from "../primitives/vent-grille";
import { BrandBadge } from "../primitives/brand-badge";

type Props = {
  palette: BrandPalette;
  sizeU: number;
  bayRows?: number;
  bayCols?: number;
  driveForm?: "2.5in" | "3.5in";
  populated?: number;
  model?: string;
  /** "dell" shows LCD info display, "hp" shows iLO button panel */
  manufacturer?: string;
};

/**
 * Server faceplate v3 — authentic drive bay grid dominant, compact control
 * panel on right, centered brand logo at bottom (Dell & HPE style).
 *
 * Dell servers have: LCD info display top-left of control panel, drive bays
 * dominate front, "DELL" logo centered at bottom of bezel.
 * HPE servers have: prominent iLO/UID buttons, "HPE" tilted bracket logo,
 * serial pull-tag indicator.
 */
export function ServerFaceplate({
  palette,
  sizeU,
  bayRows,
  bayCols,
  driveForm = "2.5in",
  populated = 0.75,
  model,
  manufacturer,
}: Props) {
  const w = 500;
  const h = 46 * sizeU;
  const earW = 10;

  const rows = bayRows ?? (sizeU >= 2 ? 2 : 1);
  const cols = bayCols ?? (driveForm === "2.5in" ? 8 : 4);

  const isDell = manufacturer?.toLowerCase() === "dell";
  const isHpe = manufacturer?.toLowerCase() === "hp";

  // Drive bay region (left 2/3 of body)
  const bayPadX = 3;
  const bayPadY = h * 0.1;
  const bayAreaX = earW + bayPadX;
  const bayAreaY = bayPadY;
  const bayAreaW = (w - earW * 2) * 0.66 - bayPadX;
  const bayAreaH = h - bayPadY - h * 0.22; // leave room for brand badge strip at bottom

  const bayGap = 1.2;
  const bayW = (bayAreaW - bayGap * (cols - 1)) / cols;
  const bayH = (bayAreaH - bayGap * (rows - 1)) / rows;

  // Control region (right 1/3)
  const ctrlX = earW + (w - earW * 2) * 0.66 + bayPadX;
  const ctrlW = w - earW - ctrlX - 3;
  const ctrlY = bayPadY;
  const ctrlH = bayAreaH;

  // LCD panel — takes upper half of control area
  const lcdW = ctrlW * 0.9;
  const lcdH = ctrlH * 0.42;

  // Buttons row below LCD
  const btnY = ctrlY + lcdH + 2;
  const btnH = ctrlH * 0.28;

  const bays = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = bayAreaX + c * (bayW + bayGap);
      const by = bayAreaY + r * (bayH + bayGap);
      const idx = r * cols + c;
      const isPopulated = idx / (rows * cols) < populated;

      bays.push(
        <g key={`${r}-${c}`}>
          {/* Bay frame (cavity) */}
          <rect
            x={bx}
            y={by}
            width={bayW}
            height={bayH}
            fill={palette.chassisDeep}
            rx={1.2}
          />
          {isPopulated ? (
            <g>
              {/* Drive face */}
              <rect
                x={bx + 0.6}
                y={by + 0.6}
                width={bayW - 1.2}
                height={bayH - 1.2}
                fill={palette.chassis}
                rx={0.8}
              />
              {/* Handle grip — horizontal bar near top of drive */}
              <rect
                x={bx + bayW * 0.2}
                y={by + 1.6}
                width={bayW * 0.6}
                height={0.6}
                fill={palette.cavity}
                opacity={0.9}
                rx={0.2}
              />
              {/* Handle grip — subtle highlight */}
              <rect
                x={bx + bayW * 0.2}
                y={by + 1.35}
                width={bayW * 0.6}
                height={0.3}
                fill="#fff"
                opacity={0.06}
                rx={0.2}
              />
              {/* Activity LED + Status LED at bottom-right corner */}
              <circle
                cx={bx + bayW - 1.6}
                cy={by + bayH - 1.5}
                r={0.6}
                fill={idx % 5 === 0 ? palette.ledActive : palette.primary}
                opacity={0.9}
              />
              <circle
                cx={bx + bayW - 3.2}
                cy={by + bayH - 1.5}
                r={0.45}
                fill={idx % 7 === 0 ? palette.ledWarn : palette.cavity}
                opacity={idx % 7 === 0 ? 0.85 : 0.3}
              />
            </g>
          ) : (
            <rect
              x={bx + 0.9}
              y={by + 0.9}
              width={bayW - 1.8}
              height={bayH - 1.8}
              fill={palette.cavity}
              opacity={0.75}
              rx={0.6}
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
      aria-label={`${manufacturer || ""} server, ${rows * cols} bays, ${sizeU}U`}
    >
      <ChassisFrame palette={palette} w={w} h={h} />

      {/* Drive bays */}
      <g>{bays}</g>

      {/* Control panel LCD (top half of right area) */}
      <LcdPanel
        palette={palette}
        x={ctrlX}
        y={ctrlY}
        width={lcdW}
        height={lcdH}
        primaryText={isHpe ? "iLO" : isDell ? "SYS ID" : palette.brandText || "SRV"}
        secondaryText={model ? model.toUpperCase() : ""}
        primarySize={lcdH * 0.36}
      />

      {/* Control buttons row */}
      <g>
        {/* Power button (green ring, circular) */}
        <circle
          cx={ctrlX + btnH * 0.5}
          cy={btnY + btnH * 0.5}
          r={Math.min(btnH * 0.42, 3.5)}
          fill={palette.chassisHi}
          stroke={palette.ledActive}
          strokeWidth={0.5}
        />
        <circle
          cx={ctrlX + btnH * 0.5}
          cy={btnY + btnH * 0.5}
          r={Math.min(btnH * 0.18, 1.4)}
          fill={palette.ledActive}
          opacity={0.92}
        />

        {/* ID / UID button (blue, circular for HPE/Dell convention) */}
        <circle
          cx={ctrlX + btnH * 0.5 + btnH * 1.1}
          cy={btnY + btnH * 0.5}
          r={Math.min(btnH * 0.35, 2.8)}
          fill={palette.chassisHi}
          stroke={palette.primary}
          strokeWidth={0.4}
        />

        {/* USB ports (pair of small slots) */}
        <rect
          x={ctrlX + btnH * 2.5}
          y={btnY + btnH * 0.28}
          width={ctrlW - btnH * 2.5 - 1}
          height={1.4}
          fill={palette.cavity}
          rx={0.3}
        />
        <rect
          x={ctrlX + btnH * 2.5}
          y={btnY + btnH * 0.58}
          width={ctrlW - btnH * 2.5 - 1}
          height={1.4}
          fill={palette.cavity}
          rx={0.3}
        />
      </g>

      {/* Bottom bezel strip — where brand logo sits IRL */}
      <rect
        x={earW + 2}
        y={h - h * 0.18}
        width={w - earW * 2 - 4}
        height={h * 0.14}
        fill={palette.chassisDeep}
        opacity={0.35}
        rx={1}
      />

      {/* Brand wordmark prominent at bottom center (real placement) */}
      <BrandBadge
        palette={palette}
        x={w / 2}
        y={h - h * 0.11}
        height={h * 0.1}
        anchor="middle"
        size={Math.min(h * 0.12, 10)}
      />

      {/* Model number below brand (Dell/HPE print model on front) */}
      {model && (
        <text
          x={w / 2}
          y={h - 2.2}
          fontSize={2.3}
          fontFamily="ui-monospace, monospace"
          fill="#fff"
          opacity={0.3}
          textAnchor="middle"
          letterSpacing="0.1em"
        >
          {model}
        </text>
      )}

      {/* Pull-tag indicator (top-left of server bezel, Dell and HPE both have these) */}
      <rect
        x={earW + 1}
        y={h * 0.05}
        width={2.5}
        height={h * 0.9}
        fill={palette.chassisDeep}
        opacity={0.6}
        rx={0.4}
      />
      <circle
        cx={earW + 2.25}
        cy={h * 0.5}
        r={0.6}
        fill={palette.primary}
        opacity={0.5}
      />
    </svg>
  );
}
