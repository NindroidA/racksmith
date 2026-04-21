export { DeviceGraphic, type DeviceGraphicProps } from "./device-graphic";
export { getBrandPalette, BRAND_PALETTES, type BrandPalette } from "./brand-palette";

/** CSS aspect-ratio value for a slot of N U (19"×1.75" per U = 10.86:1 base). */
export const U_ASPECT = 10.86;

/**
 * Helper to generate the CSS style for a device slot.
 * Usage: <div style={slotAspectStyle(sizeU)}>...
 */
export function slotAspectStyle(sizeU: number): React.CSSProperties {
  return { aspectRatio: `${U_ASPECT} / ${sizeU}`, width: "100%" };
}
