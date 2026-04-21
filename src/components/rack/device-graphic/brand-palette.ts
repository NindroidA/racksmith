export type BrandPalette = {
  /** Primary brand accent — desaturated for dark-mode harmony */
  primary: string;
  /** Secondary accent — deeper tone, used sparingly */
  secondary: string;
  /** Main chassis body — subtle brand-tinted medium-dark gray */
  chassis: string;
  /** Deeper chassis (shadow, bezel inset) — ~5 L points below chassis */
  chassisDeep: string;
  /** Lighter chassis (top bevel, raised surface) — ~8 L points above chassis */
  chassisHi: string;
  /** Port/LCD cavity — warm near-black, never pure #000 */
  cavity: string;
  /** Activity LED — unified across brands (soft green) */
  ledActive: string;
  /** Warning / PoE LED — unified across brands (warm amber) */
  ledWarn: string;
  /** Brand wordmark (abstract typography, never a real logo) */
  brandText: string;
  /** Letter-spacing tweak for brand text */
  brandTracking?: string;
};

/**
 * Color theory notes (see art-direction.md + palette-explorations.md):
 * - Primaries: HSL range S:40-55%, L:58-65% → readable on dark without vibrating
 * - Chassis base: L:17-19 (revised from L:12 to better match real device appearance —
 *   Cisco Catalyst, UniFi Pro, Dell PowerEdge are all dark-gray L:17-22 IRL, not black)
 * - Chassis tint: subtle brand hue at S:6-10% → sophistication over neutral
 * - chassisHi: ~+8 L above chassis (elevation convention)
 * - chassisDeep: ~-7 L below chassis (inset feel)
 * - LEDs unified across brands for consistency
 */

const LED_ACTIVE = "#5fd08b";
const LED_WARN = "#f5b04f";
const CAVITY = "#0b0d10";

export const BRAND_PALETTES: Record<string, BrandPalette> = {
  cisco: {
    // H196 cyan — Cisco
    primary: "#5ab4d4",
    secondary: "#3a8ba6",
    chassis: "#2b313a", // was #1b1f25 — lightened L:12→L:19
    chassisDeep: "#1a1e24",
    chassisHi: "#3e4551",
    cavity: CAVITY,
    ledActive: LED_ACTIVE,
    ledWarn: LED_WARN,
    brandText: "cisco",
    brandTracking: "0.02em",
  },
  ubiquiti: {
    // H215 blue — UniFi
    primary: "#6a9de0",
    secondary: "#4376bf",
    chassis: "#2c313c",
    chassisDeep: "#1a1e26",
    chassisHi: "#41485a",
    cavity: CAVITY,
    ledActive: LED_ACTIVE,
    ledWarn: LED_WARN,
    brandText: "UI",
    brandTracking: "0.1em",
  },
  dell: {
    // Dell minimalist — near-neutral chassis
    primary: "#6aa3c0",
    secondary: "#467a96",
    chassis: "#2a2a2e", // near-neutral dark gray
    chassisDeep: "#18181b",
    chassisHi: "#3b3b40",
    cavity: CAVITY,
    ledActive: LED_ACTIVE,
    ledWarn: LED_WARN,
    brandText: "DELL",
    brandTracking: "0.15em",
  },
  hp: {
    // H165 green — HPE
    primary: "#5fbba2",
    secondary: "#3e8a75",
    chassis: "#2a302e", // slight green warm
    chassisDeep: "#181c1b",
    chassisHi: "#3c4442",
    cavity: CAVITY,
    ledActive: LED_ACTIVE,
    ledWarn: LED_WARN,
    brandText: "HPE",
    brandTracking: "0.12em",
  },
  juniper: {
    // H75 lime — Juniper
    primary: "#a8c56c",
    secondary: "#7e974a",
    chassis: "#2e3028", // warm olive
    chassisDeep: "#1b1d16",
    chassisHi: "#41443a",
    cavity: CAVITY,
    ledActive: LED_ACTIVE,
    ledWarn: LED_WARN,
    brandText: "JUNIPER",
    brandTracking: "0.1em",
  },
  arista: {
    // H210 steel blue — Arista
    primary: "#6094c4",
    secondary: "#3e6f9c",
    chassis: "#2b303a",
    chassisDeep: "#1a1e26",
    chassisHi: "#3e4655",
    cavity: CAVITY,
    ledActive: LED_ACTIVE,
    ledWarn: LED_WARN,
    brandText: "ARISTA",
    brandTracking: "0.1em",
  },
  fs: {
    // H170 teal — FS
    primary: "#5ebfab",
    secondary: "#3c8a79",
    chassis: "#2a302f",
    chassisDeep: "#181c1b",
    chassisHi: "#3d4544",
    cavity: CAVITY,
    ledActive: LED_ACTIVE,
    ledWarn: LED_WARN,
    brandText: "FS",
    brandTracking: "0.08em",
  },
  tripplite: {
    // H354 crimson — TrippLite
    primary: "#d66f7d",
    secondary: "#a04651",
    chassis: "#2f2a2a", // slight warm red-brown
    chassisDeep: "#1c1717",
    chassisHi: "#433a3a",
    cavity: CAVITY,
    ledActive: LED_ACTIVE,
    ledWarn: LED_WARN,
    brandText: "TRIPP·LITE",
    brandTracking: "0.05em",
  },
  custom: {
    // H237 indigo — friendly fallback
    primary: "#9ea1f0",
    secondary: "#6366c4",
    chassis: "#2c2d36",
    chassisDeep: "#1a1b22",
    chassisHi: "#40414c",
    cavity: CAVITY,
    ledActive: LED_ACTIVE,
    ledWarn: LED_WARN,
    brandText: "",
  },
};

export function getBrandPalette(manufacturer: string | undefined): BrandPalette {
  if (!manufacturer) return BRAND_PALETTES.custom;
  return BRAND_PALETTES[manufacturer.toLowerCase()] ?? BRAND_PALETTES.custom;
}
