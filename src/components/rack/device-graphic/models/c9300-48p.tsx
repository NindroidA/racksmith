import { getBrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { CiscoStatusColumn } from "../primitives/cisco-status-column";
import { ModularUplinkSlot } from "../primitives/modular-uplink-slot";
import { EthPort } from "../primitives/eth-port";
import { LedBloom } from "../primitives/led-bloom";
import type { DeviceGraphicProps } from "../device-graphic";

/**
 * Cisco Catalyst 9300-48P — 48-port managed switch with the
 * signature 9300-series modular uplink slot. Layout:
 *   - Left: vertical status LED column (SYST/RPS/STAT/DUPLX/SPEED/STACK)
 *     + MODE button — the visual pattern that says "Cisco" instantly
 *   - Center: 48× RJ45 in 2 rows × 24 cols, grouped 4-by-4
 *   - Right: separated modular uplink slot with 4× SFP+ cages
 *
 * The split between port region and uplink slot is the visual cue
 * that distinguishes a 9300 from a 9200L (which has unified ports).
 */
export function C9300_48P({ sizeU }: DeviceGraphicProps) {
  const palette = getBrandPalette("cisco");
  const w = 500;
  const h = 46 * sizeU;

  // Layout zones
  const ear = 10;
  const colX = ear + 4;
  const colW = 24;
  const colH = h * 0.84;
  const colY = h * 0.08;

  // 48 ports = 2 rows × 24 cols in 6 groups of 4
  const portsX = colX + colW + 6;
  const uplinkW = h * 1.45;
  const uplinkX = w - ear - uplinkW - 4;
  const portsW = uplinkX - portsX - 6;
  const cols = 24;
  const rows = 2;
  const groupCount = 6;
  const groupGap = portsW * 0.012;
  const groupW = (portsW - groupGap * (groupCount - 1)) / groupCount;
  const portW = (groupW - 1.2 * 3) / 4;
  const portH = (h * 0.5) / rows - 0.4;
  const rowGap = 1.4;
  const portsTopY = h * 0.18;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", display: "block" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <ChassisFrame palette={palette} w={w} h={h} accentStripe={true} />

      {/* Cisco status LED column + MODE button */}
      <CiscoStatusColumn
        palette={palette}
        x={colX}
        y={colY}
        width={colW}
        height={colH}
        showWordmark={true}
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
          const lit = portIdx % 6 !== 5;
          const amber = portIdx % 11 === 0;
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
              <EthPort
                x={px}
                y={py}
                w={portW}
                h={portH}
                cavity={palette.cavity}
              />
            </g>
          );
        }),
      )}

      {/* "UPLINK" label above modular slot */}
      <text
        x={uplinkX + uplinkW / 2}
        y={h * 0.13}
        textAnchor="middle"
        fontSize={2.6}
        fontFamily="ui-monospace, monospace"
        fill={palette.chassisHi}
        opacity={0.7}
        letterSpacing="0.18em"
      >
        UPLINK
      </text>

      {/* Modular uplink slot with 4× SFP+ cages */}
      <ModularUplinkSlot
        palette={palette}
        x={uplinkX}
        y={h * 0.18}
        width={uplinkW}
        height={h * 0.7}
        variant="sfp"
        sfpCount={4}
      />

      {/* Power LED far right edge */}
      <LedBloom
        cx={w - ear - 2}
        cy={h * 0.5}
        r={0.7}
        color={palette.ledActive}
      />
    </svg>
  );
}
