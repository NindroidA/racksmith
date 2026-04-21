import type { BrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { PortGroup } from "../primitives/port-group";
import { LcdPanel } from "../primitives/lcd-panel";
import { BrandBadge } from "../primitives/brand-badge";
import { VentGrille } from "../primitives/vent-grille";

type Props = {
  palette: BrandPalette;
  portCount: number;
  sizeU: number;
  model?: string;
  manufacturer?: string;
};

/**
 * Firewall faceplate — port-heavy like a router but with a distinctive
 * "FW" red/amber accent stripe (security devices often have colored bezels).
 * Cisco ASA / Fortinet / Palo Alto style.
 */
export function FirewallFaceplate({
  palette,
  portCount,
  sizeU,
  model,
  manufacturer,
}: Props) {
  const w = 500;
  const h = 46 * sizeU;
  const earW = 10;

  // Security accent stripe (amber/red bar — distinctive "this is a firewall" cue)
  const securityAccent = palette.ledWarn;

  const lcdX = earW + 6;
  const lcdW = 80;
  const lcdY = h * 0.2;
  const lcdH = h * 0.56;

  const portX = lcdX + lcdW + 10;
  const ventX = w - earW - 16;

  const portY = h * 0.22;
  const portH = h * 0.56;

  const groupSize = Math.min(8, portCount);
  const groupsCount = Math.ceil(portCount / groupSize);
  const groupGap = 2;
  const portRegionW = ventX - portX - 4;
  const totalGapW = (groupsCount - 1) * groupGap;
  const groupW = (portRegionW - totalGapW) / groupsCount;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}
      role="img"
      aria-label={`${manufacturer || ""} firewall, ${portCount} ports, ${sizeU}U`}
    >
      <ChassisFrame palette={palette} w={w} h={h} />

      {/* Security accent stripe — amber at the top (above the primary accent) */}
      <rect
        x={earW + 3}
        y={3}
        width={w - (earW + 3) * 2}
        height={0.7}
        fill={securityAccent}
        opacity={0.85}
        rx={0.3}
      />

      {/* LCD */}
      <LcdPanel
        palette={palette}
        x={lcdX}
        y={lcdY}
        width={lcdW}
        height={lcdH}
        primaryText="FW"
        secondaryText={model ? model.toUpperCase() : palette.brandText || ""}
        tint={securityAccent}
        primarySize={Math.min(lcdH * 0.4, 12)}
      />

      {/* Ports */}
      {Array.from({ length: groupsCount }, (_, g) => {
        const n = Math.min(groupSize, portCount - g * groupSize);
        return (
          <PortGroup
            key={g}
            palette={palette}
            count={n}
            x={portX + g * (groupW + groupGap)}
            y={portY}
            width={groupW}
            height={portH}
            activeLeds={g === 0 ? 2 : 1}
          />
        );
      })}

      {/* Vent grille */}
      <VentGrille
        palette={palette}
        x={ventX}
        y={h * 0.3}
        width={12}
        height={h * 0.4}
        cols={3}
        rows={4}
      />

      {/* Power LED */}
      <circle
        cx={w - earW - 3}
        cy={h * 0.18}
        r={0.9}
        fill={palette.ledActive}
        opacity={0.9}
      />

      {/* Brand wordmark */}
      <BrandBadge
        palette={palette}
        x={w - earW - 3}
        y={h - 5.5}
        height={4}
        anchor="end"
        size={3.8}
      />
    </svg>
  );
}
