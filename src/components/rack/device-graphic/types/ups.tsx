import type { BrandPalette } from "../brand-palette";
import { ChassisFrame } from "../primitives/chassis-frame";
import { LcdPanel } from "../primitives/lcd-panel";
import { BrandBadge } from "../primitives/brand-badge";

type Props = {
  palette: BrandPalette;
  sizeU: number;
  batteryLevel?: number;
  vaRating?: string;
  model?: string;
};

/**
 * UPS faceplate — TrippLite SmartOnline style.
 * LCD shows VA + ONLINE (compact); % lives with the BATTERY bar label.
 */
export function UpsFaceplate({
  palette,
  sizeU,
  batteryLevel = 100,
  vaRating,
  model,
}: Props) {
  const w = 500;
  const h = 46 * sizeU;
  const earW = 10;

  // LCD — widened for better text fit
  const lcdX = earW + 6;
  const lcdW = Math.min(w * 0.26, 130);
  const lcdY = h * 0.12;
  const lcdH = h * 0.62;

  // Battery/Load bars (middle region)
  const barsX = lcdX + lcdW + 12;
  const barsW = w * 0.38;

  const battLabelY = h * 0.18;
  const battBarY = h * 0.24;
  const battBarH = h * 0.16;

  const loadLabelY = h * 0.46;
  const loadBarY = h * 0.52;
  const loadBarH = h * 0.14;

  const statusY = h * 0.72;
  const statusH = h * 0.22;

  const btnX = barsX + barsW + 12;
  const btnW = w - earW - btnX - 3;

  // Battery segments
  const segCount = 10;
  const segGap = 0.8;
  const segW = (barsW - segGap * (segCount - 1)) / segCount;
  const filled = Math.round((batteryLevel / 100) * segCount);

  const loadLevel = 35;
  const loadSegs = 10;
  const loadSegW = (barsW - segGap * (loadSegs - 1)) / loadSegs;
  const loadFilled = Math.round((loadLevel / 100) * loadSegs);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}
      role="img"
      aria-label={`${palette.brandText || "UPS"} ${vaRating || ""}, ${sizeU}U`}
    >
      <ChassisFrame palette={palette} w={w} h={h} />

      {/* LCD — clean: just VA and ONLINE status */}
      <LcdPanel
        palette={palette}
        x={lcdX}
        y={lcdY}
        width={lcdW}
        height={lcdH}
        primaryText={vaRating || "UPS"}
        secondaryText="ONLINE"
        tint="#34d399"
        primarySize={Math.min(lcdH * 0.36, 11)}
        secondarySize={Math.min(lcdH * 0.14, 4)}
      />

      {/* BATTERY bar */}
      <g>
        <text
          x={barsX}
          y={battLabelY}
          fontSize={2.2}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#fff"
          opacity={0.5}
          letterSpacing="0.12em"
          dominantBaseline="middle"
        >
          BATTERY
        </text>
        <text
          x={barsX + barsW}
          y={battLabelY}
          fontSize={2.4}
          fontWeight={600}
          fontFamily="ui-monospace, monospace"
          fill={palette.ledActive}
          opacity={0.8}
          dominantBaseline="middle"
          textAnchor="end"
        >
          {batteryLevel}%
        </text>
        {Array.from({ length: segCount }, (_, i) => {
          const isFilled = i < filled;
          const color = i < 6 ? palette.ledActive : i < 8 ? "#f59e0b" : "#ef4444";
          return (
            <rect
              key={`b-${i}`}
              x={barsX + i * (segW + segGap)}
              y={battBarY}
              width={segW}
              height={battBarH}
              fill={isFilled ? color : palette.cavity}
              opacity={isFilled ? 0.88 : 0.4}
              rx={0.4}
            />
          );
        })}
      </g>

      {/* LOAD bar */}
      <g>
        <text
          x={barsX}
          y={loadLabelY}
          fontSize={2.2}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill="#fff"
          opacity={0.5}
          letterSpacing="0.12em"
          dominantBaseline="middle"
        >
          LOAD
        </text>
        <text
          x={barsX + barsW}
          y={loadLabelY}
          fontSize={2.4}
          fontWeight={600}
          fontFamily="ui-monospace, monospace"
          fill={palette.ledActive}
          opacity={0.8}
          dominantBaseline="middle"
          textAnchor="end"
        >
          {loadLevel}%
        </text>
        {Array.from({ length: loadSegs }, (_, i) => {
          const isFilled = i < loadFilled;
          const color = i < 6 ? palette.ledActive : i < 8 ? "#f59e0b" : "#ef4444";
          return (
            <rect
              key={`l-${i}`}
              x={barsX + i * (loadSegW + segGap)}
              y={loadBarY}
              width={loadSegW}
              height={loadBarH}
              fill={isFilled ? color : palette.cavity}
              opacity={isFilled ? 0.78 : 0.4}
              rx={0.4}
            />
          );
        })}
      </g>

      {/* Status LEDs row */}
      {[
        { label: "PWR", color: palette.ledActive, on: true },
        { label: "BATT", color: palette.ledActive, on: true },
        { label: "AVR", color: palette.primary, on: true },
        { label: "FAULT", color: "#ef4444", on: false },
      ].map((led, i) => {
        const cx = barsX + (i + 0.5) * (barsW / 4);
        const cy = statusY + statusH * 0.3;
        return (
          <g key={led.label}>
            <circle
              cx={cx}
              cy={cy}
              r={Math.min(statusH * 0.22, 1.6)}
              fill={led.color}
              opacity={led.on ? 0.9 : 0.25}
            />
            <text
              x={cx}
              y={cy + statusH * 0.5}
              fontSize={2.1}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fill="#fff"
              textAnchor="middle"
              dominantBaseline="middle"
              opacity={0.5}
              letterSpacing="0.08em"
            >
              {led.label}
            </text>
          </g>
        );
      })}

      {/* Control buttons */}
      {["PWR", "TEST", "MUTE"].map((label, i) => {
        const bw = btnW / 3 - 1.5;
        const bx = btnX + i * (btnW / 3);
        const by = h * 0.2;
        const bh = h * 0.35;
        return (
          <g key={label}>
            <rect
              x={bx}
              y={by}
              width={bw}
              height={bh}
              fill={palette.chassisHi}
              stroke={palette.chassisDeep}
              strokeWidth={0.4}
              rx={1}
            />
            <text
              x={bx + bw / 2}
              y={by + bh / 2}
              fontSize={Math.min(bh * 0.24, 2.4)}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fill="#fff"
              textAnchor="middle"
              dominantBaseline="middle"
              opacity={0.6}
              letterSpacing="0.08em"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Brand wordmark prominent bottom */}
      <BrandBadge
        palette={palette}
        x={w / 2}
        y={h - h * 0.11}
        height={h * 0.1}
        anchor="middle"
        size={Math.min(h * 0.13, 11)}
      />

      {model && (
        <text
          x={w - earW - 4}
          y={h - 2}
          fontSize={2.1}
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
