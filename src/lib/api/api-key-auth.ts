import "server-only";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "./api-key-crypto";
import { apiError, type ApiError } from "./response";
import { TIER_LIMITS, type Plan } from "@/lib/tiers";
import { roleHasAccess, type Role } from "@/lib/permissions";

export type ApiKeyAuthContext = {
  organizationId: string;
  userId: string;           // createdByUserId — used for audit rows on mutations
  role: "member" | "admin"; // API keys cap at admin
  plan: Plan;
  apiKeyId: string;         // for ApiRequestLog + audit correlation
};

export function parseAuthHeader(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

export function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= Date.now();
}

export function isRevoked(revokedAt: Date | null): boolean {
  return revokedAt !== null;
}

/**
 * Resolve the incoming request to an ApiKeyAuthContext or an ApiError.
 * Runs before any tenant-scoped query — we use the default prisma client
 * to look up the ApiKey row globally, then callers switch to `withTenant`.
 */
export async function requireApiKey(
  req: Request,
  requiredRole: "member" | "admin",
): Promise<{ ok: true; ctx: ApiKeyAuthContext } | { ok: false; error: ApiError }> {
  const token = parseAuthHeader(req.headers.get("authorization"));
  if (!token) {
    return {
      ok: false,
      error: apiError("unauthorized", "Missing or malformed Authorization header", 401),
    };
  }

  const hash = hashApiKey(token);
  const key = await prisma.apiKey.findUnique({
    where: { hash },
    select: {
      id: true,
      organizationId: true,
      createdByUserId: true,
      role: true,
      revokedAt: true,
      expiresAt: true,
      organization: { select: { plan: true, planExpiresAt: true } },
    },
  });

  if (!key || isRevoked(key.revokedAt) || isExpired(key.expiresAt)) {
    return {
      ok: false,
      error: apiError("unauthorized", "Invalid or revoked API key", 401),
    };
  }

  // Resolve effective plan — paid plans with expired planExpiresAt downgrade
  // to free. Matches the behavior in tiers.ts getOrganizationPlan.
  const now = Date.now();
  const rawPlan = key.organization.plan as Plan;
  const plan: Plan =
    key.organization.planExpiresAt &&
    key.organization.planExpiresAt.getTime() < now &&
    rawPlan !== "free"
      ? "free"
      : rawPlan;

  if (!TIER_LIMITS[plan].apiAccess) {
    return {
      ok: false,
      error: apiError(
        "forbidden",
        `API access requires a paid plan. This organization is on ${TIER_LIMITS[plan].label}.`,
        403,
      ),
    };
  }

  const keyRole = key.role as Role;
  if (!roleHasAccess(keyRole, requiredRole)) {
    return {
      ok: false,
      error: apiError(
        "forbidden",
        `This endpoint requires ${requiredRole} role; your key has ${keyRole}.`,
        403,
      ),
    };
  }

  return {
    ok: true,
    ctx: {
      organizationId: key.organizationId,
      userId: key.createdByUserId,
      role: keyRole as "member" | "admin",
      plan,
      apiKeyId: key.id,
    },
  };
}
