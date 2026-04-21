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
 * Router faceplate — fewer ports than switch, LCD often takes more prominence,
 * console port + mgmt port distinct. Cisco ISR 1100 / UniFi Dream Machine style.
 */
export function RouterFaceplate({
  palette,
  portCount,
  sizeU,
  model,
  manufacturer,
}: Props) {
  const w = 500;
  const h = 46 * sizeU;
  const earW = 10;

  // LCD region — larger share for routers
  const lcdX = earW + 6;
  const lcdW = 110;
  const lcdY = h * 0.14;
  const lcdH = h * 0.6;

  // Console port cluster (between LCD and main ports)
  const consoleX = lcdX + lcdW + 8;
  const consoleW = 24;

  // Main port area
  const portX = consoleX + consoleW + 6;
  const ventW = 12;
  const ventX = w - earW - 16 - ventW;
  const portRegionW = ventX - portX - 4;

  const portY = h * 0.22;
  const portH = h * 0.56;
  const groupSize = Math.min(8, Math.max(4, Math.ceil(portCount / 2)));
  const groupsCount = Math.ceil(portCount / groupSize);
  const groupGap = 2;
  const totalGapW = (groupsCount - 1) * groupGap;
  const groupW = (portRegionW - totalGapW) / groupsCount;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}
      role="img"
      aria-label={`${manufacturer || ""} router, ${portCount} ports, ${sizeU}U`}
    >
      <ChassisFrame palette={palette} w={w} h={h} />

      {/* Prominent LCD */}
      <LcdPanel
        palette={palette}
        x={lcdX}
        y={lcdY}
        width={lcdW}
        height={lcdH}
        primaryText={palette.brandText || "ROUTER"}
        secondaryText={model ? model.toUpperCase() : "ROUTER"}
        primarySize={Math.min(lcdH * 0.38, 12)}
      />

      {/* Console port + mgmt LED cluster */}
      <g>
        {/* CON port (mini RJ45 cavity) */}
        <rect
          x={consoleX}
          y={h * 0.3}
          width={10}
          height={h * 0.22}
          fill={palette.cavity}
          rx={0.8}
        />
        <rect
          x={consoleX + 1}
          y={h * 0.31}
          width={8}
          height={0.4}
          fill={palette.primary}
          opacity={0.5}
        />
        <text
          x={consoleX + 5}
          y={h * 0.6}
          fontSize={2.2}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#fff"
          opacity={0.5}
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="0.05em"
        >
          CON
        </text>

        {/* MGMT LED cluster */}
        <g>
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={consoleX + 14 + i * 3.5}
              cy={h * 0.35}
              r={1}
              fill={i === 0 ? palette.ledActive : i === 1 ? palette.primary : palette.cavity}
              opacity={i === 2 ? 0.3 : 0.85}
            />
          ))}
          <text
            x={consoleX + 18}
            y={h * 0.55}
            fontSize={2.1}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fill="#fff"
            opacity={0.45}
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing="0.05em"
          >
            PWR
          </text>
        </g>
      </g>

      {/* Main WAN/LAN ports */}
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
            activeLeds={g === 0 ? 2 : 0}
          />
        );
      })}

      {/* Vent grille right */}
      <VentGrille
        palette={palette}
        x={ventX}
        y={h * 0.3}
        width={ventW}
        height={h * 0.4}
        cols={3}
        rows={4}
      />

      {/* Power LED top-right */}
      <circle
        cx={w - earW - 3}
        cy={h * 0.15}
        r={0.9}
        fill={palette.ledActive}
        opacity={0.9}
      />

      {/* Brand wordmark bottom-right subtle */}
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
