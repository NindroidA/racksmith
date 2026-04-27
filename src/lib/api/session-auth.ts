import "server-only";
import { headers } from "next/headers";
import { auth, type AuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRole, roleHasAccess, type Role } from "@/lib/permissions";
import { apiError, type ApiError } from "./response";

export type SessionAuthContext = {
  organizationId: string;
  userId: string;
  role: Role;
  session: AuthSession;
};

/**
 * Factory-shaped session-cookie auth — returns either an authenticated
 * `SessionAuthContext` or an `ApiError` ready to be finalized by
 * `createApiRoute`. Mirrors `requireApiKey` so the factory can dispatch
 * uniformly across auth modes.
 *
 * Like `requireMember` in `auth-helpers.ts`, reads `activeOrganizationId`
 * fresh from DB rather than trusting the BetterAuth session cache, which
 * goes stale after onboarding writes the column directly.
 */
export async function requireSessionMember(
  minRole: "member" | "admin",
): Promise<
  { ok: true; ctx: SessionAuthContext } | { ok: false; error: ApiError }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return {
      ok: false,
      error: apiError("unauthorized", "Unauthorized", 401),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { activeOrganizationId: true },
  });
  const activeOrgId = user?.activeOrganizationId ?? null;
  if (!activeOrgId) {
    return {
      ok: false,
      error: apiError("forbidden", "No active organization", 403),
    };
  }

  const member = await prisma.member.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: activeOrgId,
      },
    },
    select: { role: true },
  });
  if (!member) {
    return {
      ok: false,
      error: apiError("forbidden", "Not a member of this organization", 403),
    };
  }

  const role: Role = isRole(member.role) ? member.role : "viewer";
  if (!roleHasAccess(role, minRole)) {
    return {
      ok: false,
      error: apiError(
        "forbidden",
        `This action requires ${minRole} or higher.`,
        403,
      ),
    };
  }

  return {
    ok: true,
    ctx: {
      organizationId: activeOrgId,
      userId: session.user.id,
      role,
      session,
    },
  };
}
