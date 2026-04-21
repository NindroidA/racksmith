import type { BrandPalette } from "../brand-palette";

type Props = {
  palette: BrandPalette;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Big primary text shown on LCD (uppercase mono) */
  primaryText?: string;
  /** Smaller secondary text below primary */
  secondaryText?: string;
  /** LCD glow tint override. Defaults to palette.primary */
  tint?: string;
  /** Max font size for primary text (viewBox units) */
  primarySize?: number;
  /** Max font size for secondary text (viewBox units) */
  secondarySize?: number;
};

// Approximate character width at fontSize=1 for ui-monospace weight-700
// Used to auto-shrink text that would overflow LCD width.
const MONO_CHAR_W_RATIO = 0.58;

function fitText(
  text: string,
  boxWidth: number,
  boxHeight: number,
  maxSize: number,
  padding = 4
): number {
  const availableW = boxWidth - padding * 2;
  const widthCappedSize = availableW / (text.length * MONO_CHAR_W_RATIO);
  return Math.min(maxSize, boxHeight, widthCappedSize);
}

/**
 * LCD panel — dark bezeled screen with brand-tint glow + optional text.
 * Text is auto-sized to fit by both width AND height (prevents overflow on
 * long numbers like "3000VA").
 */
export function LcdPanel({
  palette,
  x,
  y,
  width,
  height,
  primaryText,
  secondaryText,
  tint,
  primarySize,
  secondarySize,
}: Props) {
  const glowColor = tint ?? palette.primary;
  const bezel = 0.8;
  const screenX = x + bezel;
  const screenY = y + bezel;
  const screenW = width - bezel * 2;
  const screenH = height - bezel * 2;

  // Auto-fit: cap primary by both the requested max AND the width needed
  const pMax = primarySize ?? height * 0.42;
  const pFitted = primaryText
    ? fitText(primaryText, screenW, screenH * 0.6, pMax)
    : pMax;

  const sMax = secondarySize ?? pFitted * 0.45;
  const sFitted = secondaryText
    ? fitText(secondaryText, screenW, screenH * 0.25, sMax)
    : sMax;

  return (
    <g>
      {/* Outer bezel */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={palette.chassisDeep}
        rx={1.2}
      />
      {/* Screen base (deep) */}
      <rect
        x={screenX}
        y={screenY}
        width={screenW}
        height={screenH}
        fill="#050809"
        rx={0.6}
      />
      {/* Brand-tinted glow overlay */}
      <rect
        x={screenX}
        y={screenY}
        width={screenW}
        height={screenH}
        fill={glowColor}
        opacity={0.14}
        rx={0.6}
      />
      {/* Subtle scanline */}
      <rect
        x={screenX}
        y={screenY + screenH / 2}
        width={screenW}
        height={0.15}
        fill="#fff"
        opacity={0.06}
      />

      {/* Primary text */}
      {primaryText && (
        <text
          x={x + width / 2}
          y={secondaryText ? y + height * 0.4 : y + height * 0.55}
          fontSize={pFitted}
          fontWeight={700}
          fontFamily="ui-monospace, 'SF Mono', monospace"
          fill={glowColor}
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="0.03em"
          opacity={0.95}
        >
          {primaryText}
        </text>
      )}
      {secondaryText && (
        <text
          x={x + width / 2}
          y={y + height * 0.72}
          fontSize={sFitted}
          fontFamily="ui-monospace, 'SF Mono', monospace"
          fill={glowColor}
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="0.1em"
          opacity={0.7}
        >
          {secondaryText}
        </text>
      )}
    </g>
  );
}
