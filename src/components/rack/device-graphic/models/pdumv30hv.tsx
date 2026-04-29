import { getBrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { LcdPanel } from "../primitives/lcd-panel";
import { NemaOutlet } from "../primitives/nema-outlet";
import { LedBloom } from "../primitives/led-bloom";
import type { DeviceGraphicProps } from "../device-graphic";

/**
 * TrippLite PDUMV30HV — metered rack PDU with NEMA 5-15R outlets.
 * Layout:
 *   - Left: large LCD wattage display ("842W · 7.1A · 120V")
 *   - Center-left: 3-LED status column (PWR/NET/ALM)
 *   - Center: 8× NEMA 5-15R outlets with smile-D ground holes —
 *     the "happy face" American 120V outlet look
 *   - Right: domed circuit breaker button + crimson accent rail
 *
 * Catalog reports the SKU as 24-outlet but at the rack-render scale
 * we draw an 8-outlet representation; the silhouette reads correctly
 * at both 60px and hero. Caller can override `outletCount` later if
 * we want to differentiate variants in the UI.
 */
export function PDUMV30HV({ sizeU, outletCount }: DeviceGraphicProps) {
  const palette = getBrandPalette("tripplite");
  const w = 500;
  const h = 46 * Math.max(1, sizeU);

  const ear = 10;
  const accent = palette.primary;

  // LCD wattage display
  const lcdX = ear + 5;
  const lcdY = h * 0.22;
  const lcdW = h * 1.05;
  const lcdH = h * 0.56;

  // Right edge — circuit breaker button
  const breakerW = h * 0.5;
  const breakerX = w - ear - breakerW - 5;

  // Outlet field
  const outletsX = lcdX + lcdW + 18;
  const outletsW = breakerX - outletsX - 4;
  const outlets = Math.max(2, Math.min(outletCount ?? 8, 12));
  const outletGap = 1.2;
  const outletSize = (outletsW - (outlets - 1) * outletGap) / outlets;
  const outletCy = h * 0.5;
  const offlineIdx = Math.min(5, outlets - 1);

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
        y={h * 0.06}
        width={w - (ear + 4) * 2}
        height={0.6}
        rx={0.3}
        fill={accent}
        opacity={0.95}
      />

      {/* LCD wattage display */}
      <LcdPanel
        palette={palette}
        x={lcdX}
        y={lcdY}
        width={lcdW}
        height={lcdH}
        primaryText="842W"
        secondaryText="7.1A · 120V"
        primarySize={9.5}
      />

      {/* Status LED column — PWR / NET / ALM */}
      {[
        { color: palette.ledActive, label: "PWR" },
        { color: palette.ledActive, label: "NET" },
        { color: palette.cavity, label: "ALM" },
      ].map((s, i) => (
        <g key={s.label}>
          <LedBloom
            cx={lcdX + lcdW + 3}
            cy={h * 0.26 + i * h * 0.18}
            r={0.5}
            color={s.color}
            intensity={s.color === palette.cavity ? 0.4 : 1}
          />
          <text
            x={lcdX + lcdW + 5}
            y={h * 0.26 + i * h * 0.18 + 1}
            fontFamily="ui-monospace, monospace"
            fontSize={2.4}
            fill={palette.chassisHi}
            opacity={0.7}
            letterSpacing="0.05em"
          >
            {s.label}
          </text>
        </g>
      ))}

      {/* NEMA 5-15R outlets — smile-D ground holes */}
      {Array.from({ length: outlets }).map((_, i) => {
        const cx = outletsX + i * (outletSize + outletGap) + outletSize / 2;
        return (
          <NemaOutlet
            key={i}
            cx={cx}
            cy={outletCy}
            size={outletSize}
            bezel={palette.chassisHi}
            face={palette.chassisDeep}
            stroke={palette.chassisDeep}
            active={i !== offlineIdx}
            activeColor={palette.ledActive}
          />
        );
      })}

      {/* Circuit breaker button — domed */}
      <rect
        x={breakerX}
        y={h * 0.22}
        width={breakerW}
        height={h * 0.56}
        rx={1.5}
        fill={palette.chassisDeep}
        stroke={palette.chassisDeep}
        strokeWidth={0.4}
      />
      <circle
        cx={breakerX + breakerW / 2}
        cy={h * 0.5}
        r={1.8}
        fill="#000"
        opacity={0.4}
      />
      <circle
        cx={breakerX + breakerW / 2}
        cy={h * 0.5}
        r={1.6}
        fill={accent}
        opacity={0.92}
      />
      <circle
        cx={breakerX + breakerW / 2 - 0.4}
        cy={h * 0.5 - 0.4}
        r={0.45}
        fill="#ffffff"
        opacity={0.4}
      />
      <text
        x={breakerX + breakerW / 2}
        y={h * 0.92}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={2.4}
        fill={palette.chassisHi}
        opacity={0.7}
        letterSpacing="0.05em"
      >
        BREAKER
      </text>
    </svg>
  );
}
