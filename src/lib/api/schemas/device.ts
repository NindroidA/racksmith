// Domain mapping notes (Prisma `Device` ↔ public API surface):
//
//   Prisma model fields                    →  API surface
//   ─────────────────────────────────────     ────────────────────────────────
//   id: String                             →  id: string
//   userId: String                         →  EXCLUDED (internal)
//   organizationId: String                 →  EXCLUDED (internal; tenant-scoped)
//   name: String                           →  name: string
//   deviceType: String                     →  deviceType: enum(DEVICE_TYPES)
//   manufacturer: String @default("")      →  manufacturer: string (non-null; empty
//                                             string is the Prisma default — the API
//                                             exposes the raw value, no mapping)
//   model: String @default("")             →  model: string (same as manufacturer)
//   sizeU: Int @default(1)                 →  sizeU: int [1..20] (min 1 per the
//                                             existing validators.ts deviceSchema —
//                                             0U devices make no sense)
//   portCount: Int @default(0)             →  portCount: int [0..1000]
//   powerWatts: Int?                       →  powerWatts: int | null
//   notes: String @default("")             →  EXCLUDED (internal notes — not
//                                             part of the public API surface)
//   rackId: String?                        →  rackId: cuid | null
//   positionU: Int?                        →  positionU: int [1..60] | null
//   ipAddress: String?                     →  ipAddress: string | null (max 45;
//                                             IPv4 + IPv6 + interface suffix)
//   macAddress: String?                    →  macAddress: string | null (max 17;
//                                             "aa:bb:cc:dd:ee:ff" form)
//   hostname: String?                      →  hostname: string | null (max 255;
//                                             RFC 1035 DNS max)
//   osFingerprint: String?                 →  EXCLUDED (discovery metadata)
//   discoveredAt: DateTime?                →  EXCLUDED (discovery metadata)
//   lastSeen: DateTime?                    →  EXCLUDED (discovery metadata)
//   isManual: Boolean @default(true)       →  EXCLUDED (discovery metadata)
//   canvasX: Float?                        →  EXCLUDED (topology UI position)
//   canvasY: Float?                        →  EXCLUDED (topology UI position)
//   createdAt: DateTime                    →  createdAt: ISO-8601 string
//   updatedAt: DateTime                    →  EXCLUDED (per E1 rack pattern)
//
// Response: whitelist-only. Excludes userId, organizationId, notes, updatedAt,
// isManual, discoveredAt, lastSeen, osFingerprint, canvasX, canvasY. Dates
// serialize as ISO-8601 strings.
//
// Name validation: matches validators.ts deviceNameSchema — rejects \n / \r / \0
// because device names flow into config-generator comment headers (Cisco IOS,
// HPE Aruba, UniFi) where a newline would split a comment into live CLI
// commands. Same defense the VLAN name uses.
import { z } from "zod";
import { DEVICE_TYPES } from "@/types";
import { registry } from "../openapi-registry";
import { paginationResponseSchema } from "./shared";

const deviceTypeEnum = z.enum(DEVICE_TYPES);

const deviceNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(
    /^[^\n\r\0]+$/,
    "Name contains disallowed control characters (newline / NUL)",
  );

export const deviceResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    deviceType: deviceTypeEnum,
    manufacturer: z.string(),
    model: z.string(),
    sizeU: z.number().int(),
    portCount: z.number().int(),
    powerWatts: z.number().int().nullable(),
    rackId: z.string().nullable(),
    positionU: z.number().int().nullable(),
    ipAddress: z.string().nullable(),
    macAddress: z.string().nullable(),
    hostname: z.string().nullable(),
    createdAt: z.coerce.date().transform((d) => d.toISOString()),
  })
  .openapi("Device");

export const createDeviceBodySchema = z
  .object({
    name: deviceNameSchema,
    deviceType: deviceTypeEnum,
    manufacturer: z.string().trim().max(50).default(""),
    model: z.string().trim().max(100).default(""),
    sizeU: z.number().int().min(1).max(20),
    portCount: z.number().int().min(0).max(1000),
    powerWatts: z.number().int().min(0).max(100000).nullable().default(null),
    rackId: z.string().cuid().nullable().default(null),
    positionU: z.number().int().min(1).max(60).nullable().default(null),
    ipAddress: z.string().trim().max(45).nullable().default(null),
    macAddress: z.string().trim().max(17).nullable().default(null),
    hostname: z.string().trim().max(255).nullable().default(null),
  })
  .strict()
  .openapi("CreateDeviceBody");

export const updateDeviceBodySchema = createDeviceBodySchema
  .partial()
  .strict()
  .openapi("UpdateDeviceBody");

export const listDevicesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    rackId: z.string().cuid().optional(),
    deviceType: deviceTypeEnum.optional(),
    manufacturer: z.string().trim().optional(),
  })
  .strict();

export const singleDeviceResponseSchema = z
  .object({ device: deviceResponseSchema })
  .openapi("DeviceResponse");

export const listDevicesResponseSchema = z
  .object({
    devices: z.array(deviceResponseSchema),
    pagination: paginationResponseSchema,
  })
  .openapi("DeviceListResponse");

registry.register("Device", deviceResponseSchema);
registry.register("CreateDeviceBody", createDeviceBodySchema);
registry.register("UpdateDeviceBody", updateDeviceBodySchema);
registry.register("DeviceResponse", singleDeviceResponseSchema);
registry.register("DeviceListResponse", listDevicesResponseSchema);
