import { getBrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { DellLcdPanel } from "../primitives/dell-lcd-panel";
import { DriveBayGrid } from "../primitives/drive-bay-grid";
import { BrandBadge } from "../primitives/brand-badge";
import { LedBloom } from "../primitives/led-bloom";
import type { DeviceGraphicProps } from "../device-graphic";

/**
 * Dell PowerEdge R750 — 2U rack server with 12× 3.5" drive bays
 * (the canonical R750 configuration). Layout:
 *   - Far left: amber Dell bezel LCD (service tag readout)
 *   - Center: 12-bay drive grid (3.5" SAS/SATA)
 *   - Right: USB ports, power button, DELL wordmark badge
 *
 * Drive handles render with metallic sheen so populated bays are
 * visually distinct from empty cavities. The Dell wordmark on the
 * right edge is sized for hero-scale legibility (a known issue with
 * the dev-page sketch was the wordmark being too small at 200px).
 */
export function R750({ sizeU }: DeviceGraphicProps) {
  const palette = getBrandPalette("dell");
  const w = 500;
  const h = 46 * sizeU;

  // Layout zones
  const ear = 10;
  const lcdX = ear + 4;
  const lcdY = h * 0.18;
  const lcdW = w * 0.085;
  const lcdH = h * 0.64;

  // Drive bays (12× 3.5" single row)
  const baysX = lcdX + lcdW + 6;
  const baysY = h * 0.1;
  const baysH = h * 0.8;
  const rightZoneW = 80;
  const baysW = w - baysX - rightZoneW - ear;

  // Right zone (USB + power + wordmark)
  const rightX = baysX + baysW + 6;
  const wordmarkH = h * 0.34;
  const wordmarkY = h * 0.5 - wordmarkH / 2;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", display: "block" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <ChassisFrame palette={palette} w={w} h={h} accentStripe={true} />

      {/* Dell bezel LCD with service tag readout */}
      <DellLcdPanel
        palette={palette}
        x={lcdX}
        y={lcdY}
        width={lcdW}
        height={lcdH}
        readout="iDRAC OK"
      />

      {/* 12× 3.5" drive bay grid */}
      <DriveBayGrid
        palette={palette}
        x={baysX}
        y={baysY}
        width={baysW}
        height={baysH}
        cols={12}
        rows={1}
        showLeds={true}
        populatedFraction={0.83}
      />

      {/* USB ports — two stacked vertically */}
      <g>
        <rect
          x={rightX}
          y={h * 0.22}
          width={9}
          height={3}
          rx={0.6}
          fill={palette.cavity}
        />
        <rect
          x={rightX + 0.6}
          y={h * 0.22 + 0.6}
          width={7.8}
          height={1.6}
          rx={0.3}
          fill={palette.chassisDeep}
        />
        <rect
          x={rightX}
          y={h * 0.32}
          width={9}
          height={3}
          rx={0.6}
          fill={palette.cavity}
        />
        <rect
          x={rightX + 0.6}
          y={h * 0.32 + 0.6}
          width={7.8}
          height={1.6}
          rx={0.3}
          fill={palette.chassisDeep}
        />
      </g>

      {/* Power button — domed circle with metallic specular */}
      <g>
        <circle
          cx={rightX + 5}
          cy={h * 0.62}
          r={2.4}
          fill={palette.chassisDeep}
        />
        <circle
          cx={rightX + 5}
          cy={h * 0.62}
          r={2.0}
          fill={palette.chassisHi}
        />
        <circle
          cx={rightX + 4.4}
          cy={h * 0.62 - 0.6}
          r={0.55}
          fill="#ffffff"
          opacity={0.45}
        />
        <circle
          cx={rightX + 5}
          cy={h * 0.62}
          r={0.7}
          fill={palette.ledActive}
          opacity={0.85}
        />
      </g>

      {/* DELL wordmark badge — hero-legible size */}
      <BrandBadge
        palette={palette}
        x={rightX + 14}
        y={wordmarkY}
        height={wordmarkH}
        anchor="start"
        size={wordmarkH * 0.65}
      />

      {/* Status LED far right */}
      <LedBloom
        cx={w - ear - 4}
        cy={h * 0.5}
        r={0.8}
        color={palette.ledActive}
      />
    </svg>
  );
}
