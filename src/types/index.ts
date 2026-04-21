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

export const COLOR_TAG_MAP: Record<ColorTag, string> = {
  blue: "#3b82f6",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
  green: "#10b981",
  orange: "#f97316",
  red: "#ef4444",
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
