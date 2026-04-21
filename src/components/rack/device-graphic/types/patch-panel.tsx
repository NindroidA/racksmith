import type { BrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { PortGroup } from "../primitives/port-group";
import { PortNumbering } from "../primitives/port-numbering";

type Props = {
  palette: BrandPalette;
  portCount: number;
  sizeU: number;
  model?: string;
};

/**
 * Patch panel — pure port grid, no LEDs, no LCD, no brand wordmark.
 * Just rows of ports with numbering. Minimalist by nature.
 */
export function PatchPanelFaceplate({
  palette,
  portCount,
  sizeU,
  model,
}: Props) {
  const w = 500;
  const h = 46 * sizeU;
  const earW = 10;

  // Full-width port grid
  const portX = earW + 6;
  const portRegionW = w - (earW + 6) * 2;
  const numberingH = 3;
  const portY = h * 0.25;
  const portH = h * 0.5;

  // Patch panels often 24 or 48 ports; split across 2 rows for 48
  const useTwoRows = portCount >= 32;
  const portsPerRow = useTwoRows ? Math.ceil(portCount / 2) : portCount;
  const rowH = useTwoRows ? (portH - 2) / 2 : portH;

  const groupSize = 6;
  const groupsPerRow = Math.ceil(portsPerRow / groupSize);
  const groupGap = 2;
  const groupW = (portRegionW - (groupsPerRow - 1) * groupGap) / groupsPerRow;

  const renderRow = (rowIdx: number, rowStartPort: number, count: number) => {
    const rowY = portY + rowIdx * (rowH + 2);
    const nodes = [];
    let remaining = count;
    let portNum = rowStartPort + 1;

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
          activeLeds={0}
        />,
      );

      // Numbering above (top row only, every group)
      if (rowIdx === 0) {
        nodes.push(
          <PortNumbering
            key={`n-${rowIdx}-${g}`}
            x={gx}
            y={portY - numberingH / 2}
            width={groupW}
            startPort={portNum}
            endPort={portNum + n - 1}
          />,
        );
      }

      portNum += n;
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
      aria-label={`${portCount}-port patch panel, ${sizeU}U`}
    >
      <ChassisFrame palette={palette} w={w} h={h} accentStripe={false} />

      {/* Thin separator line at bottom for chassis hint */}
      <rect
        x={earW + 2}
        y={h - 3}
        width={w - (earW + 2) * 2}
        height={0.4}
        fill={palette.chassisHi}
        opacity={0.5}
      />

      {useTwoRows ? (
        <>
          {renderRow(0, 0, portsPerRow)}
          {renderRow(1, portsPerRow, portCount - portsPerRow)}
        </>
      ) : (
        renderRow(0, 0, portCount)
      )}

      {/* Small model label bottom-right */}
      {model && (
        <text
          x={w - earW - 4}
          y={h - 3.5}
          fontSize={2}
          fontFamily="ui-monospace, monospace"
          fill="#fff"
          opacity={0.3}
          textAnchor="end"
        >
          {model}
        </text>
      )}
    </svg>
  );
}
