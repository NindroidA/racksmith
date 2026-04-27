import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { acquireTenantResourceLock, withTenant } from "./prisma-tenant";

// ─── Tier definitions ───────────────────────────────────────────────

export const PLANS = ["free", "pro", "business"] as const;
export type Plan = (typeof PLANS)[number];

export function isPlan(value: string): value is Plan {
  return (PLANS as readonly string[]).includes(value);
}

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
    apiRateLimitPerMinute: 0,
    apiKeyMax: 0,
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
    apiRateLimitPerMinute: 120,
    apiKeyMax: 5,
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
    apiRateLimitPerMinute: 1200,
    apiKeyMax: 50,
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
  | "plans"
  | "apiKeys";
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

// Feature gates use the same `{ ok, plan, reason? }` envelope so call sites
// branch on `result.ok` regardless of whether they're checking a count limit
// (LimitCheck) or a boolean capability (FeatureCheck). Symmetric shapes
// reduce the cognitive overhead at every API/server-action boundary.
export type FeatureCheckOk = {
  ok: true;
  plan: Plan;
};
export type FeatureCheckDenied = {
  ok: false;
  plan: Plan;
  reason: string;
};
export type FeatureCheck = FeatureCheckOk | FeatureCheckDenied;

async function checkLimit(
  organizationId: string,
  resource: Exclude<LimitResource, "apiKeys">,
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

/**
 * Tier-gate check for API-key creation, serialized via the same advisory
 * lock pattern so concurrent creates can't both see "under cap" and both
 * succeed. Mirrors `canCreateDeviceLocked`. Call inside
 * `withTenant(orgId, (tx) => canCreateApiKeyLocked(tx, orgId))` — the
 * lock is transaction-scoped. The Free tier message is custom because
 * `apiKeyMax = 0` there (generic "includes 0 API keys" reads as a bug);
 * paid tiers fall through to the shared `checkLimit` path. Only counts
 * active (non-revoked) keys toward the cap.
 */
export async function canCreateApiKeyLocked(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<LimitCheck> {
  await acquireTenantResourceLock(tx, organizationId, "apiKeys");
  const plan = await getOrganizationPlan(organizationId);
  const limit = TIER_LIMITS[plan].apiKeyMax;
  const current = await tx.apiKey.count({
    where: { organizationId, revokedAt: null },
  });

  if (limit === 0) {
    return {
      ok: false,
      reason: `The ${TIER_LIMITS[plan].label} tier does not include API access. Upgrade to Pro or Business to create API keys.`,
      plan,
      current,
      limit,
      resource: "apiKeys",
    };
  }
  if (current >= limit) {
    return {
      ok: false,
      reason: `The ${TIER_LIMITS[plan].label} tier includes ${limit} API keys. You already have ${current}.`,
      plan,
      current,
      limit,
      resource: "apiKeys",
    };
  }
  return { ok: true, plan, current, limit };
}

// ─── Feature gates (boolean tier capabilities) ─────────────────────

/**
 * Per-tier feature gates that aren't a count limit. Returns a `FeatureCheck`
 * so the call site can surface the denial reason (matches the shape used by
 * the count-based `canCreate*` helpers).
 */
export async function canExportAuditLog(
  organizationId: string,
): Promise<FeatureCheck> {
  const plan = await getOrganizationPlan(organizationId);
  if (TIER_LIMITS[plan].auditLogExport) return { ok: true, plan };
  return {
    ok: false,
    plan,
    reason: `Audit log export requires the Pro or Business tier. This organization is on ${TIER_LIMITS[plan].label}.`,
  };
}

export async function canExportFormat(
  organizationId: string,
  format: string,
): Promise<FeatureCheck> {
  const plan = await getOrganizationPlan(organizationId);
  if (TIER_LIMITS[plan].exports.includes(format)) return { ok: true, plan };
  return {
    ok: false,
    plan,
    reason: `${format.toUpperCase()} export requires the Pro or Business tier. This organization is on ${TIER_LIMITS[plan].label}.`,
  };
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
