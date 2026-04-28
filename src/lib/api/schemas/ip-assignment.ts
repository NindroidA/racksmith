import { z } from "zod";
import { registry } from "../openapi-registry";
import { paginationResponseSchema } from "./shared";

const IP_ASSIGNMENT_STATUSES = ["assigned", "reserved", "dhcp"] as const;

// Response — whitelist-only. Excludes userId, organizationId, updatedAt,
// and any internal metadata. Dates serialize as ISO-8601 strings. The
// IpAssignment model has no field renames vs. the dashboard (`subnetId`,
// `ipAddress`, `deviceId`, `status`, `notes` all match Prisma 1:1) — the
// serializer just normalizes `createdAt: Date` → ISO string.
export const ipAssignmentResponseSchema = z
  .object({
    id: z.string(),
    subnetId: z.string(),
    ipAddress: z.string(),
    deviceId: z.string().nullable(),
    status: z.enum(IP_ASSIGNMENT_STATUSES),
    notes: z.string(),
    createdAt: z.coerce.date().transform((d) => d.toISOString()),
  })
  .openapi("IpAssignment");

// IP validation kept to a max-length string check (max 45 covers IPv6).
// Strict octet/hex parsing happens at the dashboard via `isValidIp`; the
// API trusts the wire format for IPv4 + IPv6 documentation flexibility,
// matching the loose-CIDR convention from `subnet.ts`.
export const createIpAssignmentBodySchema = z
  .object({
    subnetId: z.string().cuid(),
    ipAddress: z.string().trim().min(1).max(45),
    deviceId: z.string().cuid().nullable().default(null),
    status: z.enum(IP_ASSIGNMENT_STATUSES).default("assigned"),
    notes: z.string().trim().max(500).default(""),
  })
  .strict()
  .openapi("CreateIpAssignmentBody");

export const updateIpAssignmentBodySchema = createIpAssignmentBodySchema
  .partial()
  .strict()
  .openapi("UpdateIpAssignmentBody");

export const listIpAssignmentsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    subnetId: z.string().cuid().optional(),
    status: z.enum(IP_ASSIGNMENT_STATUSES).optional(),
    deviceId: z.string().cuid().optional(),
  })
  .strict();

export const singleIpAssignmentResponseSchema = z
  .object({ ipAssignment: ipAssignmentResponseSchema })
  .openapi("IpAssignmentResponse");

export const listIpAssignmentsResponseSchema = z
  .object({
    ipAssignments: z.array(ipAssignmentResponseSchema),
    pagination: paginationResponseSchema,
  })
  .openapi("IpAssignmentListResponse");

registry.register("IpAssignment", ipAssignmentResponseSchema);
registry.register("CreateIpAssignmentBody", createIpAssignmentBodySchema);
registry.register("UpdateIpAssignmentBody", updateIpAssignmentBodySchema);
registry.register("IpAssignmentResponse", singleIpAssignmentResponseSchema);
registry.register(
  "IpAssignmentListResponse",
  listIpAssignmentsResponseSchema,
);

export { IP_ASSIGNMENT_STATUSES };
