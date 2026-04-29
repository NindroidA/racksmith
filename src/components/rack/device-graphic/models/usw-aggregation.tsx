import { getBrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { SfpCage } from "../primitives/sfp-cage";
import { LedBloom } from "../primitives/led-bloom";
import { BrandBadge } from "../primitives/brand-badge";
import type { DeviceGraphicProps } from "../device-graphic";

/**
 * USW-Aggregation — pure-SFP+ aggregation switch, 8 cages, no RJ45,
 * no touchscreen. The silhouette is intentionally minimal so it
 * doesn't get confused with the populated UDM-Pro / 48 / 24
 * Enterprise faces — it's the "fiber-only" UniFi product.
 *
 *   - Left: large UI brand wordmark (no touchscreen on this SKU)
 *   - Center-right: 8× SFP+ cages
 *   - Right: power LED
 */
export function UswAggregation({ sizeU }: DeviceGraphicProps) {
  const palette = getBrandPalette("ubiquiti");
  const w = 500;
  const h = 46 * sizeU;

  // Layout
  const ear = 10;
  const badgeX = ear + 12;
  const badgeY = h * 0.35;
  const badgeH = h * 0.3;

  // 8× SFP+ cages span the right two-thirds of the chassis
  const cagesX = badgeX + 60;
  const cagesY = h * 0.18;
  const cagesH = h * 0.64;
  const cagesW = w - cagesX - ear - 18;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", display: "block" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <ChassisFrame palette={palette} w={w} h={h} accentStripe={true} />

      {/* Brand wordmark replaces the touchscreen on this SKU */}
      <BrandBadge
        palette={palette}
        x={badgeX}
        y={badgeY}
        height={badgeH}
        anchor="start"
      />

      {/* 8× SFP+ cages */}
      <SfpCage
        palette={palette}
        x={cagesX}
        y={cagesY}
        width={cagesW}
        height={cagesH}
        count={8}
      />

      {/* SFP+ label */}
      <text
        x={cagesX + cagesW / 2}
        y={h * 0.12}
        textAnchor="middle"
        fontSize={2.6}
        fontFamily="ui-monospace, monospace"
        fill={palette.chassisHi}
        opacity={0.7}
        letterSpacing="0.18em"
      >
        10G SFP+
      </text>

      {/* Power LED */}
      <LedBloom
        cx={w - ear - 4}
        cy={h * 0.5}
        r={0.7}
        color={palette.ledActive}
      />
    </svg>
  );
}
