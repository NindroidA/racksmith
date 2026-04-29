import { getBrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { LedStatusRing } from "../primitives/led-status-ring";
import { UnifiTouchscreen } from "../primitives/unifi-touchscreen";
import { EthPort } from "../primitives/eth-port";
import { SfpCage } from "../primitives/sfp-cage";
import { LedBloom } from "../primitives/led-bloom";
import type { DeviceGraphicProps } from "../device-graphic";

/**
 * UDM-Pro — UniFi Dream Machine Pro flagship gateway. 1U chassis with:
 *   - Left: 1.3" touchscreen + LED status ring (the family-signature
 *     pair that makes a UDM-Pro instantly recognizable in a rack)
 *   - Center: 8× RJ45 LAN ports in 2 groups of 4 (anti-barcode rhythm)
 *   - Right: 1× RJ45 WAN + 1× 1G SFP+ WAN + 1× 10G SFP+ WAN
 *   - USB-C console port + power LED on the right edge
 *
 * Total = 11 ports (matches the catalog seed). The LAN/WAN split is
 * separated by a thin chassis pinstripe so a viewer can read which
 * ports are uplink-side at a glance.
 *
 * This is the family-signature reference renderer — Phase B's USW
 * switches reuse the same primitive set for visual continuity.
 */
export function UdmPro({ sizeU }: DeviceGraphicProps) {
  const palette = getBrandPalette("ubiquiti");
  const w = 500;
  const h = 46 * sizeU;

  // Layout zones
  const ear = 10;
  const ringCx = ear + 16;
  const ringR = h * 0.36;
  const ringCy = h * 0.5;

  const tsX = ringCx + ringR + 5;
  const tsW = h * 0.78;
  const tsH = h * 0.78;
  const tsY = h * 0.11;

  // 8× LAN RJ45 in 2 groups of 4
  const lanX = tsX + tsW + 18;
  const lanCount = 8;
  const groupGap = 4;
  const portW = 14;
  const portH = h * 0.62;
  const portY = h * 0.19;
  const groupW = portW * 4 + 1.2 * 3;
  const lanW = groupW * 2 + groupGap;

  // WAN section (right of pinstripe)
  const sepX = lanX + lanW + 10;
  const wanX = sepX + 10;
  const wanRjW = portW;
  const sfpY = h * 0.21;
  const sfpH = h * 0.58;
  const sfpW = 22;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", display: "block" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <ChassisFrame palette={palette} w={w} h={h} accentStripe={true} />

      {/* LED status ring — left of touchscreen */}
      <LedStatusRing
        palette={palette}
        cx={ringCx}
        cy={ringCy}
        r={ringR}
        litFraction={0.85}
      />

      {/* 1.3" touchscreen — UniFi signature */}
      <UnifiTouchscreen
        palette={palette}
        x={tsX}
        y={tsY}
        width={tsW}
        height={tsH}
        label="UI"
      />

      {/* 8× LAN RJ45 — 2 groups of 4 */}
      {Array.from({ length: lanCount }).map((_, i) => {
        const groupIdx = Math.floor(i / 4);
        const inGroupIdx = i % 4;
        const px =
          lanX + groupIdx * (groupW + groupGap) + inGroupIdx * (portW + 1.2);
        const lit = i % 5 !== 4;
        return (
          <g key={`lan-${i}`}>
            <LedBloom
              cx={px + portW / 2}
              cy={portY - 1.6}
              r={0.4}
              color={lit ? palette.ledActive : palette.cavity}
              intensity={lit ? 1 : 0.4}
            />
            <EthPort
              x={px}
              y={portY}
              w={portW}
              h={portH}
              cavity={palette.cavity}
            />
          </g>
        );
      })}

      {/* LAN/WAN separator pinstripe */}
      <rect
        x={sepX}
        y={h * 0.18}
        width={0.6}
        height={h * 0.64}
        fill={palette.chassisHi}
        opacity={0.5}
      />

      {/* WAN RJ45 */}
      <g>
        <LedBloom
          cx={wanX + wanRjW / 2}
          cy={portY - 1.6}
          r={0.4}
          color={palette.ledActive}
        />
        <EthPort
          x={wanX}
          y={portY}
          w={wanRjW}
          h={portH}
          cavity={palette.cavity}
        />
      </g>

      {/* 1G SFP+ + 10G SFP+ uplinks */}
      <SfpCage
        palette={palette}
        x={wanX + wanRjW + 6}
        y={sfpY}
        width={sfpW}
        height={sfpH}
        count={1}
      />
      <SfpCage
        palette={palette}
        x={wanX + wanRjW + 6 + sfpW + 4}
        y={sfpY}
        width={sfpW}
        height={sfpH}
        count={1}
      />

      {/* Power LED (far right) */}
      <LedBloom
        cx={w - ear - 4}
        cy={h * 0.5}
        r={0.7}
        color={palette.ledActive}
      />

      {/* Tiny WAN/LAN labels above the port banks */}
      <text
        x={lanX + lanW / 2}
        y={h * 0.12}
        textAnchor="middle"
        fontSize={2.6}
        fontFamily="ui-monospace, monospace"
        fill={palette.chassisHi}
        opacity={0.7}
        letterSpacing="0.18em"
      >
        LAN
      </text>
      <text
        x={wanX + (wanRjW + 6 + sfpW * 2 + 4) / 2}
        y={h * 0.12}
        textAnchor="middle"
        fontSize={2.6}
        fontFamily="ui-monospace, monospace"
        fill={palette.chassisHi}
        opacity={0.7}
        letterSpacing="0.18em"
      >
        WAN
      </text>
    </svg>
  );
}
