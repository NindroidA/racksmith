import type { BrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { PortGroup } from "../primitives/port-group";
import { SfpCage } from "../primitives/sfp-cage";
import { LcdPanel } from "../primitives/lcd-panel";
import { UnifiTouchscreen } from "../primitives/unifi-touchscreen";
import { CiscoStatusColumn } from "../primitives/cisco-status-column";
import { PortNumbering } from "../primitives/port-numbering";
import { VentGrille } from "../primitives/vent-grille";
import { BrandBadge } from "../primitives/brand-badge";

type Props = {
  palette: BrandPalette;
  portCount: number;
  sizeU: number;
  sfpCount?: number;
  hasPoE?: boolean;
  model?: string;
  /** Manufacturer slug, drives brand-specific left panel variant */
  manufacturer?: string;
};

const BRAND_LEFT_PANEL: Record<string, "unifi" | "cisco" | "generic"> = {
  ubiquiti: "unifi",
  cisco: "cisco",
};

function brandAccentBottomStrip(palette: BrandPalette, w: number, h: number) {
  // Only UniFi has the signature blue status LED strip along bottom
  return (
    <rect
      x={12}
      y={h - 2}
      width={w - 24}
      height={0.7}
      fill={palette.primary}
      opacity={0.4}
      rx={0.3}
    />
  );
}

/**
 * Switch faceplate v3 — brand-specific left panels (UniFi touch screen,
 * Cisco LED stack), port-group blocks with numbering, SFP cages, vent grille.
 */
export function SwitchFaceplate({
  palette,
  portCount,
  sizeU,
  sfpCount = 4,
  hasPoE = false,
  model,
  manufacturer,
}: Props) {
  const w = 500;
  const h = 46 * sizeU;

  const earW = 10;
  const leftVariant =
    (manufacturer && BRAND_LEFT_PANEL[manufacturer.toLowerCase()]) || "generic";
  const isUnifi = leftVariant === "unifi";
  const isCisco = leftVariant === "cisco";

  // Left panel region (brand-specific)
  const leftX = earW + 4;
  const leftW = isUnifi ? h * 0.82 : isCisco ? 28 : 62; // UniFi touch is square-ish
  const leftY = isUnifi ? (h - leftW) / 2 : h * 0.12;
  const leftH = isUnifi ? leftW : h * 0.76;

  // SFP region (right)
  const sfpAreaW = Math.min(sfpCount * 9 + 4, 52);
  const sfpX = w - earW - 6 - sfpAreaW;
  const sfpY = h * 0.28;
  const sfpH = h * 0.44;

  // Vent grille between port region and SFP
  const ventW = 8;
  const ventX = sfpX - ventW - 3;

  // Port region (center)
  const portX = leftX + leftW + 6;
  const portRegionW = ventX - portX - 3;

  const useTwoRows = portCount >= 32;
  const portsPerRow = useTwoRows ? Math.ceil(portCount / 2) : portCount;
  const groupSize = 6;
  const groupsPerRow = Math.ceil(portsPerRow / groupSize);

  const groupGap = 1.8;
  const totalGapW = (groupsPerRow - 1) * groupGap;
  const groupW = (portRegionW - totalGapW) / groupsPerRow;

  // Port numbering takes a tiny strip at top
  const numberingH = 2.6;
  const portY = h * 0.2 + numberingH;
  const portH = h * 0.7 - numberingH;
  const rowH = useTwoRows ? (portH - 1.5) / 2 : portH;

  const portTint = hasPoE ? palette.ledWarn : palette.primary;

  const renderPortsAndNumbering = (
    rowIdx: number,
    rowStartPort: number,
    rowPortCount: number,
  ) => {
    const rowY = portY + rowIdx * (rowH + 1.5);
    const nodes = [];
    let remaining = rowPortCount;
    let portNumStart = rowStartPort + 1;

    for (let g = 0; g < groupsPerRow && remaining > 0; g++) {
      const n = Math.min(groupSize, remaining);
      const gx = portX + g * (groupW + groupGap);

      nodes.push(
        <PortGroup
          key={`g-${rowIdx}-${g}`}
          palette={palette}
          count={n}
          x={gx}
          y={rowY}
          width={groupW}
          height={rowH}
          tintColor={portTint}
          activeLeds={g === 0 ? 2 : g === 1 ? 1 : 0}
        />,
      );

      // Numbering above first row only (to avoid clutter)
      if (rowIdx === 0 && n > 1) {
        nodes.push(
          <PortNumbering
            key={`n-${rowIdx}-${g}`}
            x={gx}
            y={portY - numberingH / 2}
            width={groupW}
            startPort={portNumStart}
            endPort={portNumStart + n - 1}
          />,
        );
      }

      portNumStart += n;
      remaining -= n;
    }
    return nodes;
  };

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}
      role="img"
      aria-label={`${manufacturer || ""} switch, ${portCount} ports, ${sizeU}U`}
    >
      <ChassisFrame palette={palette} w={w} h={h} />

      {/* Brand-specific left panel */}
      {isUnifi && (
        <UnifiTouchscreen
          palette={palette}
          x={leftX}
          y={leftY}
          width={leftW}
          height={leftH}
          label="UI"
          sublabel={hasPoE ? "PoE+" : undefined}
        />
      )}
      {isCisco && (
        <CiscoStatusColumn
          palette={palette}
          x={leftX}
          y={leftY}
          width={leftW}
          height={leftH}
        />
      )}
      {!isUnifi && !isCisco && (
        <LcdPanel
          palette={palette}
          x={leftX}
          y={leftY}
          width={leftW}
          height={leftH}
          primaryText={palette.brandText || "SW"}
          secondaryText={
            model ? model.toUpperCase().slice(0, 8) : `${portCount}P`
          }
          primarySize={leftH * 0.38}
        />
      )}

      {/* Port rows */}
      {useTwoRows ? (
        <>
          {renderPortsAndNumbering(0, 0, portsPerRow)}
          {renderPortsAndNumbering(1, portsPerRow, portCount - portsPerRow)}
        </>
      ) : (
        renderPortsAndNumbering(0, 0, portCount)
      )}

      {/* Vent grille for chassis authenticity */}
      <VentGrille
        palette={palette}
        x={ventX}
        y={h * 0.32}
        width={ventW}
        height={h * 0.36}
        cols={2}
        rows={useTwoRows ? 6 : 3}
      />

      {/* SFP uplinks */}
      {sfpCount > 0 && (
        <SfpCage
          palette={palette}
          x={sfpX}
          y={sfpY}
          width={sfpAreaW}
          height={sfpH}
          count={sfpCount}
        />
      )}

      {/* Corner power LED — every real switch has one */}
      <circle
        cx={w - earW - 3}
        cy={h * 0.15}
        r={0.8}
        fill={palette.ledActive}
        opacity={0.9}
      />

      {/* Bottom status LED strip (UniFi only) */}
      {isUnifi && brandAccentBottomStrip(palette, w, h)}
    </svg>
  );
}
