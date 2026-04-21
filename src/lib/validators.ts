import { z } from "zod";
import { COLOR_TAGS, DEVICE_TYPES } from "@/types";

export const rackSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  sizeU: z.number().int().min(1, "Size must be at least 1U").max(60),
  location: z.string().trim().max(200).default(""),
  description: z.string().trim().max(500).default(""),
  colorTag: z.enum(COLOR_TAGS).default("blue"),
});

// Device names flow into config-generator headers (Cisco IOS, HPE Aruba, UniFi)
// where a newline or Unicode format/control char would split a comment line
// into live CLI commands. Reject those characters at the validator layer —
// same defense the VLAN name uses.
const deviceNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100)
  .regex(
    /^[^\n\r\0]+$/,
    "Name contains disallowed control characters (newline / NUL)",
  );

export const deviceSchema = z.object({
  name: deviceNameSchema,
  deviceType: z.enum(DEVICE_TYPES),
  manufacturer: z.string().trim().max(50).default(""),
  model: z.string().trim().max(100).default(""),
  sizeU: z.number().int().min(1).max(20).default(1),
  portCount: z.number().int().min(0).max(1000).default(0),
  powerWatts: z.number().int().min(0).max(100000).nullable().optional(),
  notes: z.string().trim().max(1000).default(""),
  ipAddress: z.string().trim().max(45).nullable().optional(),
  macAddress: z.string().trim().max(17).nullable().optional(),
  hostname: z.string().trim().max(255).nullable().optional(),
  rackId: z.string().cuid().nullable().optional(),
  positionU: z.number().int().min(1).max(60).nullable().optional(),
});

export const deviceImportRowSchema = z.object({
  name: deviceNameSchema,
  deviceType: z.enum(DEVICE_TYPES),
  manufacturer: z.string().trim().max(50).default(""),
  model: z.string().trim().max(100).default(""),
  sizeU: z.number().int().min(1).max(20).default(1),
  portCount: z.number().int().min(0).max(1000).default(0),
  powerWatts: z.number().int().min(0).max(100000).nullable().optional(),
  ipAddress: z.string().trim().max(45).nullable().optional(),
  macAddress: z.string().trim().max(17).nullable().optional(),
  hostname: z.string().trim().max(255).nullable().optional(),
  notes: z.string().trim().max(1000).default(""),
});

export const placeDeviceSchema = z.object({
  rackId: z.string().cuid(),
  deviceId: z.string().cuid(),
  positionU: z.number().int().min(1).max(60),
});

export const placeCatalogDeviceSchema = z.object({
  rackId: z.string().cuid(),
  catalogId: z.string().cuid(),
  positionU: z.number().int().min(1).max(60),
  customName: z.string().trim().max(100).optional(),
});

const CABLE_TYPES = [
  "ethernet",
  "fiber",
  "sfp",
  "dac",
  "power",
  "other",
] as const;

export const connectionSchema = z.object({
  sourceDeviceId: z.string().cuid(),
  sourcePort: z.string().trim().max(50).default(""),
  targetDeviceId: z.string().cuid(),
  targetPort: z.string().trim().max(50).default(""),
  cableType: z.enum(CABLE_TYPES).default("ethernet"),
  cableLengthFt: z.number().min(0).max(1000).nullable().optional(),
  vlan: z.string().trim().max(50).nullable().optional(),
  bandwidth: z.string().trim().max(20).nullable().optional(),
  description: z.string().trim().max(500).default(""),
});

export const devicePositionSchema = z.object({
  deviceId: z.string().cuid(),
  x: z.number().finite(),
  y: z.number().finite(),
});

const IP_ASSIGNMENT_STATUSES = ["assigned", "reserved", "dhcp"] as const;

export const subnetSchema = z.object({
  cidr: z
    .string()
    .trim()
    .min(1, "CIDR is required")
    .max(64)
    .regex(/\//, "CIDR must include a prefix length (e.g. /24)"),
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).default(""),
  gateway: z.string().trim().max(45).nullable().optional(),
  dnsServers: z.string().trim().max(400).default(""),
  colorTag: z.enum(COLOR_TAGS).default("blue"),
});

export const dhcpRangeSchema = z.object({
  subnetId: z.string().cuid(),
  startIp: z.string().trim().min(1).max(45),
  endIp: z.string().trim().min(1).max(45),
  label: z.string().trim().max(100).default(""),
});

export const ipAssignmentSchema = z.object({
  subnetId: z.string().cuid(),
  ipAddress: z.string().trim().min(1).max(45),
  deviceId: z.string().cuid().nullable().optional(),
  status: z.enum(IP_ASSIGNMENT_STATUSES).default("assigned"),
  notes: z.string().trim().max(500).default(""),
});

export type SubnetInput = z.infer<typeof subnetSchema>;
export type DhcpRangeInput = z.infer<typeof dhcpRangeSchema>;
export type IpAssignmentInput = z.infer<typeof ipAssignmentSchema>;
export { IP_ASSIGNMENT_STATUSES };

const VLAN_PURPOSES = [
  "user",
  "management",
  "iot",
  "guest",
  "voip",
  "storage",
  "other",
] as const;
const VLAN_ASSIGN_MODES = ["access", "trunk", "native"] as const;

// Names flow verbatim into CLI config generators (Cisco IOS, UniFi JSON,
// HPE Aruba). Reject newlines + NULs so user-supplied names can't break
// config structure or inject CLI directives when the output is pasted.
const noControlChars = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[^\n\r\0]+$/, "Name contains disallowed control characters");

export const vlanSchema = z.object({
  vlanId: z.number().int().min(1).max(4094),
  name: noControlChars,
  description: z.string().trim().max(500).default(""),
  colorTag: z.enum(COLOR_TAGS).default("purple"),
  purpose: z.enum(VLAN_PURPOSES).default("user"),
});

export const vlanAssignmentSchema = z.object({
  vlanId: z.string().cuid(),
  deviceId: z.string().cuid(),
  mode: z.enum(VLAN_ASSIGN_MODES).default("access"),
  portNumber: z.number().int().min(1).max(1000).nullable().optional(),
  tagged: z.boolean().default(true),
});

export type VlanInput = z.infer<typeof vlanSchema>;
export type VlanAssignmentInput = z.infer<typeof vlanAssignmentSchema>;
export { VLAN_PURPOSES, VLAN_ASSIGN_MODES };

// ─── Phase 9 — Plan Wizard ─────────────────────────

const SITE_TYPES = ["home", "small_office", "msp_client"] as const;
const UPLINK_SPEEDS = ["1G", "10G", "25G"] as const;
const WIZARD_STEPS = ["profile", "topology", "network", "review"] as const;

export const wizardProfileSchema = z.object({
  siteType: z.enum(SITE_TYPES),
  deviceCount: z.number().int().min(1).max(1000),
  poeBudgetW: z.number().int().min(0).max(10000),
  uplinkSpeed: z.enum(UPLINK_SPEEDS),
  growthMultiplier: z.number().min(1).max(3),
});

export const wizardTopologyDeviceSchema = z.object({
  manufacturer: z.string().trim().min(1).max(50),
  model: z.string().trim().min(1).max(100),
  deviceType: z.enum([
    "switch",
    "router",
    "firewall",
    "server",
    "other",
  ] as const),
  sizeU: z.number().int().min(0).max(20),
  portCount: z.number().int().min(0).max(1000),
  powerWatts: z.number().int().min(0).max(100000).nullable(),
  reason: z.string().trim().max(300),
});

export const wizardTopologySchema = z.object({
  selected: z.array(wizardTopologyDeviceSchema).min(1).max(50),
  rackName: z.string().trim().min(1).max(100),
  rackSizeU: z.number().int().min(1).max(60),
});

export const wizardVlanLineSchema = z.object({
  vlanId: z.number().int().min(1).max(4094),
  name: z.string().trim().min(1).max(40),
  purpose: z.enum(VLAN_PURPOSES),
  subnetSuffix: z.number().int().min(0).max(255),
});

// Phase 9 wizard slices the parent CIDR into /24s by replacing the third
// octet — IPv6 has no equivalent, so reject anything that isn't an IPv4 CIDR.
// (Materialize would otherwise silently skip subnet creation.)
const IPV4_CIDR_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\/(?:[0-9]|[12]\d|3[0-2])$/;

export const wizardNetworkSchema = z.object({
  parentCidr: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(
      IPV4_CIDR_RE,
      "Parent CIDR must be a valid IPv4 CIDR (e.g. 10.0.0.0/16)",
    ),
  vlans: z.array(wizardVlanLineSchema).min(0).max(20),
});

// Reusable helper: validate a CUID-shaped resource ID before passing into a
// Prisma `where: { id }` clause. Standardizes the "Invalid X ID" error path
// across server actions.
export const cuidSchema = z.string().cuid();

export const wizardInputsSchema = z.object({
  profile: wizardProfileSchema.optional(),
  topology: wizardTopologySchema.optional(),
  network: wizardNetworkSchema.optional(),
});

export const buildPlanCreateSchema = z.object({
  name: z.string().trim().min(1).max(100).default("Untitled plan"),
});

export const wizardStepSchema = z.enum(WIZARD_STEPS);

export type WizardProfileInput = z.infer<typeof wizardProfileSchema>;
export type WizardTopologyInput = z.infer<typeof wizardTopologySchema>;
export type WizardNetworkInput = z.infer<typeof wizardNetworkSchema>;
export type WizardInputsValidated = z.infer<typeof wizardInputsSchema>;
export type BuildPlanCreateInput = z.infer<typeof buildPlanCreateSchema>;
// Literal-union types derived from the const arrays — re-exported so
// wizard-types.ts and non-Zod consumers reference a single source of truth
// instead of hand-writing parallel unions.
export type SiteType = (typeof SITE_TYPES)[number];
export type UplinkSpeed = (typeof UPLINK_SPEEDS)[number];
export type VlanPurpose = (typeof VLAN_PURPOSES)[number];
export type WizardStep = (typeof WIZARD_STEPS)[number];
export { SITE_TYPES, UPLINK_SPEEDS, WIZARD_STEPS };

// ─── Phase 9 — Recommendation dismissals ──────────

export const dismissRecommendationSchema = z.object({
  ruleKey: z.string().trim().min(1).max(80),
  entityKey: z.string().trim().min(1).max(120),
  // null/undefined = dismiss forever, otherwise snooze duration in days
  snoozeDays: z.number().int().min(1).max(365).nullable().optional(),
});

export type DismissRecommendationInput = z.infer<
  typeof dismissRecommendationSchema
>;

export type RackInput = z.infer<typeof rackSchema>;
export type DeviceInput = z.infer<typeof deviceSchema>;
export type DeviceImportRow = z.infer<typeof deviceImportRowSchema>;
export type PlaceDeviceInput = z.infer<typeof placeDeviceSchema>;
export type PlaceCatalogDeviceInput = z.infer<typeof placeCatalogDeviceSchema>;
export type ConnectionInput = z.infer<typeof connectionSchema>;
export type DevicePositionInput = z.infer<typeof devicePositionSchema>;
export { CABLE_TYPES };
