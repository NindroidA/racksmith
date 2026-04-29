import { getBrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { UnifiTouchscreen } from "../primitives/unifi-touchscreen";
import { EthPort } from "../primitives/eth-port";
import { SfpCage } from "../primitives/sfp-cage";
import { LedBloom } from "../primitives/led-bloom";
import type { DeviceGraphicProps } from "../device-graphic";

/**
 * USW-Pro-48-PoE — 48-port 1U managed switch with 4× SFP+ uplinks.
 * The most-rendered UniFi switch in real deployments. Layout:
 *   - Left: 1.3" touchscreen (UniFi family signature)
 *   - Center: 48× RJ45 in 2 rows × 24 cols, grouped 4-by-4 with a
 *     wider gap between groups so the eye doesn't read it as a
 *     barcode. PoE-capable (we light all ports).
 *   - Right: 4× SFP+ uplink cages
 *
 * Port-row anti-barcode rhythm matches the canonical art template:
 * groups of 4 with 2× gap between groups.
 */
export function UswPro48Poe({ sizeU }: DeviceGraphicProps) {
  const palette = getBrandPalette("ubiquiti");
  const w = 500;
  const h = 46 * sizeU;

  // Layout zones
  const ear = 10;
  const tsX = ear + 5;
  const tsW = h * 0.78;
  const tsH = h * 0.78;
  const tsY = h * 0.11;

  // 48 ports = 2 rows × 24 cols, in 6 groups of 4 per row
  const portsX = tsX + tsW + 12;
  const sfpCount = 4;
  const sfpReserveW = 80;
  const portsW = w - portsX - sfpReserveW - ear;
  const cols = 24;
  const rows = 2;
  const groupCount = 6;
  const groupGap = portsW * 0.012;
  const groupW = (portsW - groupGap * (groupCount - 1)) / groupCount;
  const portW = (groupW - 1.2 * 3) / 4;
  const portH = (h * 0.5) / rows - 0.4;
  const rowGap = 1.4;
  const portsTopY = h * 0.16;

  // SFP+ uplinks
  const sfpX = portsX + portsW + 6;
  const sfpY = h * 0.21;
  const sfpH = h * 0.58;
  const sfpW = sfpReserveW - 8;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", display: "block" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <ChassisFrame palette={palette} w={w} h={h} accentStripe={true} />

      <UnifiTouchscreen
        palette={palette}
        x={tsX}
        y={tsY}
        width={tsW}
        height={tsH}
        label="UI"
      />

      {/* 48× RJ45 — 2 rows × 24 cols × groups of 4 */}
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((__, ci) => {
          const groupIdx = Math.floor(ci / 4);
          const inGroupIdx = ci % 4;
          const px =
            portsX +
            groupIdx * (groupW + groupGap) +
            inGroupIdx * (portW + 1.2);
          const py = portsTopY + ri * (portH + rowGap);
          const portIdx = ri * cols + ci;
          const lit = portIdx % 7 !== 6;
          const amber = portIdx % 13 === 0;
          const ledColor = !lit
            ? palette.cavity
            : amber
              ? palette.ledWarn
              : palette.ledActive;
          return (
            <g key={`${ri}-${ci}`}>
              <LedBloom
                cx={px + portW / 2}
                cy={py - 1.2}
                r={0.32}
                color={ledColor}
                intensity={lit ? 1 : 0.4}
              />
              <EthPort x={px} y={py} w={portW} h={portH} cavity={palette.cavity} />
            </g>
          );
        }),
      )}

      {/* 4× SFP+ uplink cages */}
      <SfpCage
        palette={palette}
        x={sfpX}
        y={sfpY}
        width={sfpW}
        height={sfpH}
        count={sfpCount}
      />

      {/* Power LED */}
      <LedBloom
        cx={w - ear - 4}
        cy={h * 0.5}
        r={0.7}
        color={palette.ledActive}
      />

      {/* SFP+ label */}
      <text
        x={sfpX + sfpW / 2}
        y={h * 0.12}
        textAnchor="middle"
        fontSize={2.6}
        fontFamily="ui-monospace, monospace"
        fill={palette.chassisHi}
        opacity={0.7}
        letterSpacing="0.18em"
      >
        SFP+
      </text>
    </svg>
  );
}
