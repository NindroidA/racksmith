export const DEVICE_TYPES = [
  "router",
  "switch",
  "server",
  "firewall",
  "ups",
  "patch_panel",
  "pdu",
  "storage",
  "other",
] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

export const COLOR_TAGS = [
  "blue",
  "purple",
  "cyan",
  "green",
  "orange",
  "red",
] as const;

export type ColorTag = (typeof COLOR_TAGS)[number];

// User-facing color tags for racks/devices. Aligned with the brand
// palette (globals.css @theme) so a user-tagged blue rack matches the
// app's primary indigo, etc. Visually distinct across the six tones.
export const COLOR_TAG_MAP: Record<ColorTag, string> = {
  blue: "#5765f4",
  purple: "#a674f6",
  cyan: "#22d3ee",
  green: "#0bb678",
  orange: "#eb8c2e",
  red: "#e63946",
};

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  router: "Router",
  switch: "Switch",
  server: "Server",
  firewall: "Firewall",
  ups: "UPS",
  patch_panel: "Patch Panel",
  pdu: "PDU",
  storage: "Storage",
  other: "Other",
};
