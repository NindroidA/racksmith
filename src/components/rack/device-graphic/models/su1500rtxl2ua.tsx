import { getBrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { LcdPanel } from "../primitives/lcd-panel";
import { LedBarGraph } from "../primitives/led-bar-graph";
import { NemaOutlet } from "../primitives/nema-outlet";
import { LedBloom } from "../primitives/led-bloom";
import { BrandBadge } from "../primitives/brand-badge";
import type { DeviceGraphicProps } from "../device-graphic";

/**
 * TrippLite SmartOnline SU1500RTXL2UA — 2U online UPS, 1500VA. Layout:
 *   - Left: large LCD ("ONLINE 62%" with battery percent + load)
 *   - Center: 10-segment LED bar graph (load indicator) + side LED
 *   - Right: 6× NEMA 5-15R battery-backed outlets in 2 rows × 3 cols
 *   - TRIPP·LITE wordmark below outlets
 *
 * The LCD/bar-graph pair is the single most distinctive UPS feature
 * — runtime is the metric that matters most when scanning a rack
 * for a faulted UPS, and the load bar makes it readable from across
 * the room. 2U lets us split the outlet field into 2 rows.
 */
export function SU1500RTXL2UA({
  sizeU,
  vaRating,
  batteryLevel,
}: DeviceGraphicProps) {
  const palette = getBrandPalette("tripplite");
  const w = 500;
  const h = 46 * Math.max(1, sizeU);

  const ear = 10;
  // Default to 100 so the rack visualizer (which doesn't pass
  // batteryLevel) renders a healthy/full UPS rather than a partially
  // depleted one. Matches the existing UpsFaceplate type-template.
  const battery = batteryLevel ?? 100;
  const accent = palette.primary;

  // LCD on the left
  const lcdX = ear + 6;
  const lcdY = h * 0.14;
  const lcdW = w * 0.26;
  const lcdH = h * 0.72;

  // 10-segment battery-charge bar graph in the middle-left. (Real
  // SmartOnline UPSes show a load bar AND a battery bar; we only
  // have batteryLevel in DeviceGraphicProps today, so this single
  // bar tracks battery charge — relabel to BATT to match the data.)
  const colX = lcdX + lcdW + 6;
  const loadX = colX + 14;
  const loadW = w * 0.3;
  const loadY = h * 0.46;
  const loadH = h * 0.16;

  // 6× outlets on the right — 2 rows × 3 cols
  const outletsX = loadX + loadW + 10;
  const outletsW = w - outletsX - ear - 8;
  const outletCols = 3;
  const outletRows = 2;
  const outletGapX = 1.5;
  const outletGapY = 1.5;
  const outletSize = Math.min(
    (outletsW - outletGapX * (outletCols - 1)) / outletCols,
    (h * 0.7 - outletGapY * (outletRows - 1)) / outletRows,
  );
  const outletsBlockH = outletSize * outletRows + outletGapY * (outletRows - 1);
  const outletsBlockY = (h - outletsBlockH) / 2 - 1;

  // Wordmark — sits under the outlets, full-width-ish
  const wordmarkY = outletsBlockY + outletsBlockH + 0.5;
  const wordmarkH = h - wordmarkY - 1;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", display: "block" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <ChassisFrame palette={palette} w={w} h={h} accentStripe={false} />

      {/* Crimson accent rail along the top */}
      <rect
        x={ear + 4}
        y={h * 0.05}
        width={w - (ear + 4) * 2}
        height={0.6}
        rx={0.3}
        fill={accent}
        opacity={0.95}
      />

      {/* LCD — runtime + load percent */}
      <LcdPanel
        palette={palette}
        x={lcdX}
        y={lcdY}
        width={lcdW}
        height={lcdH}
        primaryText="ONLINE"
        secondaryText={
          vaRating ? `${vaRating} · ${battery}%` : `1500VA · ${battery}%`
        }
        primarySize={lcdH * 0.32}
      />

      {/* 10-segment load bar graph */}
      <LedBarGraph x={loadX} y={loadY} w={loadW} h={loadH} value={battery} />

      {/* "LOAD" + "%" labels above and beside the bar */}
      <text
        x={loadX}
        y={loadY - 1.5}
        fontFamily="ui-monospace, monospace"
        fontSize={2.4}
        fill={palette.chassisHi}
        opacity={0.7}
        letterSpacing="0.18em"
      >
        BATT
      </text>
      <text
        x={loadX + loadW + 2}
        y={loadY + loadH * 0.62}
        fontFamily="ui-monospace, monospace"
        fontSize={2.6}
        fill={palette.chassisHi}
        opacity={0.7}
      >
        %
      </text>

      {/* On-line LED next to bar */}
      <LedBloom cx={colX + 5} cy={h * 0.34} r={0.6} color={palette.ledActive} />
      <text
        x={colX + 8}
        y={h * 0.36}
        fontFamily="ui-monospace, monospace"
        fontSize={2.4}
        fill={palette.chassisHi}
        opacity={0.7}
        letterSpacing="0.05em"
      >
        ON LINE
      </text>

      {/* 6× NEMA 5-15R outlets — 2 rows × 3 cols */}
      {Array.from({ length: outletRows }).map((_, ri) =>
        Array.from({ length: outletCols }).map((__, ci) => {
          const cx = outletsX + ci * (outletSize + outletGapX) + outletSize / 2;
          const cy =
            outletsBlockY + ri * (outletSize + outletGapY) + outletSize / 2;
          return (
            <NemaOutlet
              key={`${ri}-${ci}`}
              cx={cx}
              cy={cy}
              size={outletSize}
              bezel={palette.chassisHi}
              face={palette.chassisDeep}
              stroke={palette.chassisDeep}
              active={true}
              activeColor={palette.ledActive}
            />
          );
        }),
      )}

      {/* TRIPP·LITE wordmark */}
      <BrandBadge
        palette={palette}
        x={
          outletsX +
          (outletSize * outletCols + outletGapX * (outletCols - 1)) / 2
        }
        y={wordmarkY}
        height={wordmarkH}
        anchor="middle"
        size={wordmarkH * 0.7}
      />
    </svg>
  );
}
