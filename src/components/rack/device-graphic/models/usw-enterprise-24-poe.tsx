import { getBrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { UnifiTouchscreen } from "../primitives/unifi-touchscreen";
import { EthPort } from "../primitives/eth-port";
import { SfpCage } from "../primitives/sfp-cage";
import { LedBloom } from "../primitives/led-bloom";
import type { DeviceGraphicProps } from "../device-graphic";

/**
 * USW-Enterprise-24-PoE — 24-port 2.5G switch with 4× SFP28 uplinks.
 * Single-row layout (vs. the 48-port's 2-row stack), so the silhouette
 * reads visibly distinct. Larger ports than the 48 (single row gets
 * more vertical room) helps sell "Enterprise".
 *
 *   - Left: 1.3" touchscreen
 *   - Center: 24× 2.5G RJ45 in single row, grouped 4-by-4
 *   - Right: 4× SFP28 uplinks
 */
export function UswEnterprise24Poe({ sizeU }: DeviceGraphicProps) {
  const palette = getBrandPalette("ubiquiti");
  const w = 500;
  const h = 46 * sizeU;

  // Layout zones
  const ear = 10;
  const tsX = ear + 5;
  const tsW = h * 0.78;
  const tsH = h * 0.78;
  const tsY = h * 0.11;

  // 24 ports in a single row, 6 groups of 4
  const portsX = tsX + tsW + 12;
  const sfpReserveW = 80;
  const portsW = w - portsX - sfpReserveW - ear;
  const cols = 24;
  const groupCount = 6;
  const groupGap = portsW * 0.012;
  const groupW = (portsW - groupGap * (groupCount - 1)) / groupCount;
  const portW = (groupW - 1.2 * 3) / 4;
  const portH = h * 0.62;
  const portY = h * 0.19;

  // SFP28 uplinks
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
        sublabel="2.5G"
      />

      {/* 24× 2.5G RJ45 in a single row, grouped 4-by-4 */}
      {Array.from({ length: cols }).map((_, ci) => {
        const groupIdx = Math.floor(ci / 4);
        const inGroupIdx = ci % 4;
        const px =
          portsX +
          groupIdx * (groupW + groupGap) +
          inGroupIdx * (portW + 1.2);
        const lit = ci % 5 !== 4;
        return (
          <g key={ci}>
            <LedBloom
              cx={px + portW / 2}
              cy={portY - 1.6}
              r={0.4}
              color={lit ? palette.ledActive : palette.cavity}
              intensity={lit ? 1 : 0.4}
            />
            <EthPort x={px} y={portY} w={portW} h={portH} cavity={palette.cavity} />
          </g>
        );
      })}

      {/* 4× SFP28 uplink cages */}
      <SfpCage
        palette={palette}
        x={sfpX}
        y={sfpY}
        width={sfpW}
        height={sfpH}
        count={4}
      />

      {/* Power LED */}
      <LedBloom
        cx={w - ear - 4}
        cy={h * 0.5}
        r={0.7}
        color={palette.ledActive}
      />

      {/* SFP28 label */}
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
        SFP28
      </text>
    </svg>
  );
}
