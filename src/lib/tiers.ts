import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { acquireTenantResourceLock, withTenant } from "./prisma-tenant";

// ─── Tier definitions ───────────────────────────────────────────────

export type Plan = "free" | "pro" | "business";

export const TIER_LIMITS = {
  free: {
    label: "Free",
    sites: 1,
    racks: 3,
    devices: 30,
    subnets: 3,
    vlans: 5,
    plans: 1,
    teamMembers: 1,
    apiAccess: false,
    auditLogExport: false,
    exports: ["png"] as readonly string[],
  },
  pro: {
    label: "Pro",
    sites: Infinity,
    racks: Infinity,
    devices: Infinity,
    subnets: Infinity,
    vlans: Infinity,
    plans: Infinity,
    teamMembers: 5,
    apiAccess: true,
    auditLogExport: true,
    exports: ["png", "pdf", "csv", "svg"] as readonly string[],
  },
  business: {
    label: "Business",
    sites: Infinity,
    racks: Infinity,
    devices: Infinity,
    subnets: Infinity,
    vlans: Infinity,
    plans: Infinity,
    teamMembers: Infinity,
    apiAccess: true,
    auditLogExport: true,
    exports: ["png", "pdf", "csv", "svg"] as readonly string[],
  },
} as const;

export type TierLimits = (typeof TIER_LIMITS)[Plan];

// ─── Dev-only bypass (never works in production) ────────────────────

/**
 * Read the bypass flag at call-time so unit tests / runtime env mutations
 * are reflected without a re-import. Hard-wired to no-op in production.
 */
function isDevBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const raw = process.env.RACKSMITH_DEV_BYPASS_TIERS;
  return raw === "true" || raw === "1";
}

// ─── Resolvers ──────────────────────────────────────────────────────

function normalizePlan(raw: string | null | undefined): Plan {
  if (raw === "pro") return "pro";
  if (raw === "business") return "business";
  return "free";
}

export function getEffectivePlan(dbPlan: string | null | undefined): Plan {
  if (isDevBypassEnabled()) return "business";
  return normalizePlan(dbPlan);
}

/**
 * Resolve an organization's current plan, honoring expiry and the dev bypass.
 * Returns "free" for missing organizations or expired paid plans.
 */
export async function getOrganizationPlan(
  organizationId: string,
): Promise<Plan> {
  if (isDevBypassEnabled()) return "business";

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true, planExpiresAt: true },
  });
  if (!org) return "free";

  if (org.planExpiresAt && org.planExpiresAt.getTime() < Date.now()) {
    return "free";
  }

  return normalizePlan(org.plan);
}

export function getLimits(plan: Plan): TierLimits {
  return TIER_LIMITS[plan];
}

// ─── Per-resource checks ────────────────────────────────────────────

export type LimitResource =
  | "racks"
  | "sites"
  | "devices"
  | "subnets"
  | "vlans"
  | "plans";
export type LimitCheckOk = {
  ok: true;
  plan: Plan;
  current: number;
  limit: number;
};
export type LimitCheckDenied = {
  ok: false;
  reason: string;
  plan: Plan;
  current: number;
  limit: number;
  resource: LimitResource;
};
export type LimitCheck = LimitCheckOk | LimitCheckDenied;

async function checkLimit(
  organizationId: string,
  resource: LimitResource,
  current: number,
): Promise<LimitCheck> {
  const plan = await getOrganizationPlan(organizationId);
  const limit = TIER_LIMITS[plan][resource];

  if (Number.isFinite(limit) && current >= limit) {
    const noun = resource.endsWith("s") ? resource.slice(0, -1) : resource;
    return {
      ok: false,
      reason: `The ${TIER_LIMITS[plan].label} tier includes ${limit} ${noun}${limit === 1 ? "" : "s"}. You already have ${current}.`,
      plan,
      current,
      limit,
      resource,
    };
  }

  return { ok: true, plan, current, limit };
}

export async function canCreateRack(
  organizationId: string,
): Promise<LimitCheck> {
  const current = await withTenant(organizationId, (tx) =>
    tx.rack.count({ where: { organizationId } }),
  );
  return checkLimit(organizationId, "racks", current);
}

export async function canCreateDevice(
  organizationId: string,
): Promise<LimitCheck> {
  const current = await withTenant(organizationId, (tx) =>
    tx.device.count({ where: { organizationId } }),
  );
  return checkLimit(organizationId, "devices", current);
}

export async function canCreateSubnet(
  organizationId: string,
): Promise<LimitCheck> {
  const current = await withTenant(organizationId, (tx) =>
    tx.subnet.count({ where: { organizationId } }),
  );
  return checkLimit(organizationId, "subnets", current);
}

export async function canCreateVlan(
  organizationId: string,
): Promise<LimitCheck> {
  const current = await withTenant(organizationId, (tx) =>
    tx.vlan.count({ where: { organizationId } }),
  );
  return checkLimit(organizationId, "vlans", current);
}

export async function canCreatePlan(
  organizationId: string,
): Promise<LimitCheck> {
  const current = await withTenant(organizationId, (tx) =>
    tx.buildPlan.count({
      where: { organizationId, status: "draft" },
    }),
  );
  return checkLimit(organizationId, "plans", current);
}

// ─── Advisory-lock variants (close R3 TOCTOU on concurrent creates) ──
//
// The non-locked `canCreate*` helpers above remain valid for read-only
// preflight (server-component pages, UI enablement checks). For the
// actual create path, wrap in `withTenant` and call the `*Locked`
// variant inside the transaction — the advisory lock serializes any
// concurrent transaction on the same `(organizationId, resource)` pair
// so the count + insert is atomic against the limit.
//
// Usage:
//   await withTenant(organizationId, async (tx) => {
//     const check = await canCreateRackLocked(tx, organizationId);
//     if (!check.ok) throw new TierDeniedError(check);
//     await tx.rack.create({ data: { ... } });
//   });

export async function canCreateRackLocked(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<LimitCheck> {
  await acquireTenantResourceLock(tx, organizationId, "racks");
  const current = await tx.rack.count({ where: { organizationId } });
  return checkLimit(organizationId, "racks", current);
}

export async function canCreateDeviceLocked(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<LimitCheck> {
  await acquireTenantResourceLock(tx, organizationId, "devices");
  const current = await tx.device.count({ where: { organizationId } });
  return checkLimit(organizationId, "devices", current);
}

export async function canCreateSubnetLocked(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<LimitCheck> {
  await acquireTenantResourceLock(tx, organizationId, "subnets");
  const current = await tx.subnet.count({ where: { organizationId } });
  return checkLimit(organizationId, "subnets", current);
}

export async function canCreateVlanLocked(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<LimitCheck> {
  await acquireTenantResourceLock(tx, organizationId, "vlans");
  const current = await tx.vlan.count({ where: { organizationId } });
  return checkLimit(organizationId, "vlans", current);
}

export async function canCreatePlanLocked(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<LimitCheck> {
  await acquireTenantResourceLock(tx, organizationId, "plans");
  const current = await tx.buildPlan.count({
    where: { organizationId, status: "draft" },
  });
  return checkLimit(organizationId, "plans", current);
}

// ─── Feature gates (boolean tier capabilities) ─────────────────────

/**
 * Per-tier feature gates that aren't a count limit. Returns true when the
 * organization's effective plan grants the capability.
 */
export async function canExportAuditLog(
  organizationId: string,
): Promise<boolean> {
  const plan = await getOrganizationPlan(organizationId);
  return TIER_LIMITS[plan].auditLogExport;
}

export async function canExportFormat(
  organizationId: string,
  format: string,
): Promise<boolean> {
  const plan = await getOrganizationPlan(organizationId);
  return TIER_LIMITS[plan].exports.includes(format);
}

export type UsageSummary = {
  plan: Plan;
  planLabel: string;
  racks: { current: number; limit: number | null };
  sites: { current: number; limit: number | null };
  devices: { current: number; limit: number | null };
  subnets: { current: number; limit: number | null };
  vlans: { current: number; limit: number | null };
  plans: { current: number; limit: number | null };
};

// ─── Per-user membership caps (BA `organizationLimit` callback) ──────

const ORG_MEMBERSHIP_CAPS: Record<Plan, number> = {
  free: 3,
  pro: 10,
  business: Infinity,
};

/**
 * Highest plan tier across a user's memberships. Used by
 * `getOrganizationLimitForUser` to decide their org-cap. Free if they have
 * no memberships yet.
 */
async function getUserHighestPlan(userId: string): Promise<Plan> {
  if (isDevBypassEnabled()) return "business";

  const memberships = await prisma.member.findMany({
    where: { userId },
    select: {
      organization: { select: { plan: true, planExpiresAt: true } },
    },
  });
  if (memberships.length === 0) return "free";

  let best: Plan = "free";
  const now = Date.now();
  for (const m of memberships) {
    const { plan, planExpiresAt } = m.organization;
    const effective =
      planExpiresAt && planExpiresAt.getTime() < now
        ? "free"
        : normalizePlan(plan);
    if (effective === "business") return "business";
    if (effective === "pro" && best === "free") best = "pro";
  }
  return best;
}

/**
 * Cap on the number of organizations a user can be a member of, derived
 * from the highest-tier plan across their memberships.
 *
 * Used by Better Auth's `organizationLimit` callback. The handoff §13d
 * decision is "memberships, not ownerships" — so we cap creation as a
 * proxy for total membership growth (BA does not expose a join-time hook).
 */
export async function getOrganizationLimitForUser(
  userId: string,
): Promise<number> {
  const plan = await getUserHighestPlan(userId);
  return ORG_MEMBERSHIP_CAPS[plan];
}

/**
 * Per-organization member cap. Reads the org's plan and returns the
 * `teamMembers` limit. Used by Better Auth's `membershipLimit` callback.
 */
export async function getMembershipLimitForOrganization(
  organizationId: string,
): Promise<number> {
  const plan = await getOrganizationPlan(organizationId);
  return TIER_LIMITS[plan].teamMembers;
}

/**
 * One-shot usage summary for UIs. `null` limit = unlimited.
 */
export async function getUsageSummary(
  organizationId: string,
): Promise<UsageSummary> {
  const plan = await getOrganizationPlan(organizationId);
  const limits = TIER_LIMITS[plan];

  const [rackCount, deviceCount, subnetCount, vlanCount, planCount] =
    await withTenant(organizationId, (tx) =>
      Promise.all([
        tx.rack.count({ where: { organizationId } }),
        tx.device.count({ where: { organizationId } }),
        tx.subnet.count({ where: { organizationId } }),
        tx.vlan.count({ where: { organizationId } }),
        tx.buildPlan.count({ where: { organizationId, status: "draft" } }),
      ]),
    );
  const sitesInUse = rackCount > 0 ? 1 : 0;

  const toLimit = (n: number): number | null => (Number.isFinite(n) ? n : null);

  return {
    plan,
    planLabel: limits.label,
    racks: { current: rackCount, limit: toLimit(limits.racks) },
    sites: { current: sitesInUse, limit: toLimit(limits.sites) },
    devices: { current: deviceCount, limit: toLimit(limits.devices) },
    subnets: { current: subnetCount, limit: toLimit(limits.subnets) },
    vlans: { current: vlanCount, limit: toLimit(limits.vlans) },
    plans: { current: planCount, limit: toLimit(limits.plans) },
  };
}
