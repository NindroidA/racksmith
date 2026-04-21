// Plan wizard input shapes. Stored verbatim in BuildPlan.inputs (Json), one
// step per top-level key. The wizard is server-state — we re-fetch and
// re-render after every step rather than juggling client local state.
//
// Literal-union types (SiteType, UplinkSpeed, VlanPurpose, WizardStep) are
// derived from the Zod const arrays in @/lib/validators and re-exported
// here so client components can `import type` them without pulling Zod
// into the client bundle.

export type {
  SiteType,
  UplinkSpeed,
  VlanPurpose,
  WizardStep,
} from "@/lib/validators";

import type { SiteType, UplinkSpeed, VlanPurpose } from "@/lib/validators";

export type ProfileInput = {
  siteType: SiteType;
  deviceCount: number; // estimated count, 1-1000
  poeBudgetW: number; // in watts, 0-10000
  uplinkSpeed: UplinkSpeed;
  growthMultiplier: number; // 1.0 - 3.0
};

export type RecommendedDevice = {
  // Match against DeviceCatalog by `manufacturer + model` when applying.
  // We don't pin a catalogId because catalog rows can change between
  // wizard-save and apply.
  manufacturer: string;
  model: string;
  deviceType: "switch" | "router" | "firewall" | "server" | "other";
  sizeU: number;
  portCount: number;
  powerWatts: number | null;
  reason: string;
};

export type TopologyInput = {
  // User-confirmed devices to materialize (after potentially deselecting
  // some recommendations). Mutable to match the Zod-inferred shape from
  // wizardTopologySchema.
  selected: RecommendedDevice[];
  rackName: string;
  rackSizeU: number;
};

export type VlanLine = {
  vlanId: number;
  name: string;
  purpose: VlanPurpose;
  // /24 within the parent will be sliced for each VLAN line.
  subnetSuffix: number; // e.g. 10 → 10.x.10.0/24
};

export type NetworkInput = {
  parentCidr: string; // e.g. "10.0.0.0/16"
  vlans: VlanLine[];
};

// All inputs combined — what's stored in BuildPlan.inputs.
export type WizardInputs = {
  profile?: ProfileInput;
  topology?: TopologyInput;
  network?: NetworkInput;
};

export const SITE_TYPE_LABELS: Record<SiteType, string> = {
  home: "Home / homelab",
  small_office: "Small office",
  msp_client: "MSP client deployment",
};

export const UPLINK_LABELS: Record<UplinkSpeed, string> = {
  "1G": "1 Gbps",
  "10G": "10 Gbps (SFP+ / Cat6a)",
  "25G": "25 Gbps (SFP28 / DAC)",
};
