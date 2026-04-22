// Plan wizard input shapes. Stored verbatim in BuildPlan.inputs (Json), one
// step per top-level key. The wizard is server-state — we re-fetch and
// re-render after every step rather than juggling client local state.
//
// All shapes (input objects + literal unions) derive from the Zod schemas
// in @/lib/validators via `z.infer` and are re-exported here as pure types
// so client components can `import type` them without pulling Zod into the
// client bundle. Single source of truth is validators.ts; any drift would
// break at the TypeScript level.

export type {
  SiteType,
  UplinkSpeed,
  VlanPurpose,
  WizardStep,
  WizardProfileInput as ProfileInput,
  WizardTopologyInput as TopologyInput,
  WizardTopologyDeviceInput as RecommendedDevice,
  WizardNetworkInput as NetworkInput,
  WizardVlanLineInput as VlanLine,
} from "@/lib/validators";

import type {
  SiteType,
  UplinkSpeed,
  WizardProfileInput,
  WizardTopologyInput,
  WizardNetworkInput,
} from "@/lib/validators";

// All inputs combined — what's stored in BuildPlan.inputs.
export type WizardInputs = {
  profile?: WizardProfileInput;
  topology?: WizardTopologyInput;
  network?: WizardNetworkInput;
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
