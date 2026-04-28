import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Bay grid columns (e.g. 12 for R750 12×3.5", 24 for R750 24×2.5") */
  cols: number;
  /** Bay grid rows (1 for 1U R650, 2 for some R750 configs) */
  rows: number;
  /** Render an LED on each bay (default true) */
  showLeds?: boolean;
  /** Fraction of bays "populated" with a drive (0–1, default 1) */
  populatedFraction?: number;
};

/**
 * Dell PowerEdge / HPE ProLiant drive bay grid — the dominant front-panel
 * feature on rack servers and storage arrays. Each bay shows a drive
 * handle (small recessed pull-tab shape) and an optional status LED.
 *
 * Configurable rows × cols so the same primitive serves R650 (1×10),
 * R750 12×3.5" (1×12), R750 24×2.5" (2×12), and HPE DL360/380 (1×8 or
 * 2×8). Caller decides the count — see the plan's §6 manufacturer notes
 * for canonical layouts per model.
 */
export function DriveBayGrid({
  palette,
  x,
  y,
  width,
  height,
  cols,
  rows,
  showLeds = true,
  populatedFraction = 1,
}: Props) {
  if (cols <= 0 || rows <= 0) return null;

  const gap = 0.6;
  const bayW = (width - gap * (cols + 1)) / cols;
  const bayH = (height - gap * (rows + 1)) / rows;
  const total = cols * rows;
  const populated = Math.round(
    total * Math.max(0, Math.min(1, populatedFraction)),
  );

  const bays: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const bx = x + gap + c * (bayW + gap);
      const by = y + gap + r * (bayH + gap);
      const isPopulated = idx < populated;
      bays.push(
        <g key={`bay-${r}-${c}`}>
          {/* Bay cavity */}
          <rect
            x={bx}
            y={by}
            width={bayW}
            height={bayH}
            fill={palette.cavity}
            rx={0.4}
          />
          {/* Drive handle (only when populated) */}
          {isPopulated && (
            <rect
              x={bx + bayW * 0.08}
              y={by + bayH * 0.18}
              width={bayW * 0.84}
              height={bayH * 0.64}
              fill={palette.chassisHi}
              opacity={0.75}
              rx={0.3}
            />
          )}
          {/* Pull-tab indent on the handle */}
          {isPopulated && (
            <rect
              x={bx + bayW * 0.4}
              y={by + bayH * 0.42}
              width={bayW * 0.2}
              height={bayH * 0.16}
              fill={palette.chassisDeep}
              opacity={0.6}
              rx={0.2}
            />
          )}
          {/* Status LED */}
          {showLeds && (
            <circle
              cx={bx + bayW * 0.92}
              cy={by + bayH * 0.16}
              r={Math.min(bayW, bayH) * 0.07}
              fill={isPopulated ? palette.ledActive : palette.cavity}
              opacity={isPopulated ? 0.85 : 0.4}
            />
          )}
        </g>,
      );
    }
  }

  return <g>{bays}</g>;
}
