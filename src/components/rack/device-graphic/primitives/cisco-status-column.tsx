import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Show "cisco" wordmark above LEDs (default true) */
  showWordmark?: boolean;
};

/**
 * Cisco's signature vertical status LED column — SYST / RPS / STAT / DUPLX /
 * SPEED / STACK with a MODE button below. Instantly says "Cisco".
 */
export function CiscoStatusColumn({
  palette,
  x,
  y,
  width,
  height,
  showWordmark = true,
}: Props) {
  const LEDS = [
    { label: "SYST", color: palette.ledActive, on: true },
    { label: "RPS", color: palette.primary, on: false },
    { label: "STAT", color: palette.ledActive, on: true },
    { label: "DUPLX", color: palette.primary, on: true },
    { label: "SPEED", color: palette.ledWarn, on: false },
    { label: "STACK", color: palette.primary, on: true },
  ];

  const wordmarkH = showWordmark ? height * 0.13 : 0;
  const ledAreaY = y + wordmarkH + 0.5;
  const modeBtnH = height * 0.2;
  const ledAreaH = height - wordmarkH - modeBtnH - 1;
  const rowH = ledAreaH / LEDS.length;

  const ledX = x + 1.5;
  const labelX = x + 5;

  return (
    <g>
      {/* "cisco" wordmark at top */}
      {showWordmark && (
        <text
          x={x + width / 2}
          y={y + wordmarkH / 2}
          fontSize={Math.min(wordmarkH * 0.85, 5)}
          fontWeight={700}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill={palette.primary}
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="0.02em"
          opacity={0.9}
        >
          cisco
        </text>
      )}

      {/* Status LEDs */}
      {LEDS.map((led, i) => {
        const ly = ledAreaY + i * rowH + rowH / 2;
        return (
          <g key={led.label}>
            {/* LED dot */}
            <circle
              cx={ledX}
              cy={ly}
              r={Math.min(rowH * 0.25, 0.85)}
              fill={led.on ? led.color : palette.cavity}
              opacity={led.on ? 0.92 : 0.4}
            />
            {/* Label */}
            <text
              x={labelX}
              y={ly}
              fontSize={Math.min(rowH * 0.48, 2.2)}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fill="#fff"
              opacity={0.45}
              dominantBaseline="middle"
              letterSpacing="0.03em"
            >
              {led.label}
            </text>
          </g>
        );
      })}

      {/* MODE button below LEDs */}
      <rect
        x={x + 0.5}
        y={y + height - modeBtnH}
        width={width - 1}
        height={modeBtnH * 0.7}
        fill={palette.chassisHi}
        stroke={palette.chassisDeep}
        strokeWidth={0.3}
        rx={1}
      />
      <text
        x={x + width / 2}
        y={y + height - modeBtnH + modeBtnH * 0.35}
        fontSize={Math.min(modeBtnH * 0.45, 2.6)}
        fontWeight={600}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fill="#fff"
        opacity={0.6}
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing="0.1em"
      >
        MODE
      </text>
    </g>
  );
}
