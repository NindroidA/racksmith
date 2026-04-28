import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { isRole, roleHasAccess, type Role } from "./permissions";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/**
 * Require an authenticated user AND an active Organization membership at or
 * above the given role. Used by every server action that touches
 * tenant-scoped resources.
 *
 * Redirects:
 *   - no session             → /login
 *   - session + no active org → /onboarding/welcome
 *   - active org + not a member → /dashboard (shouldn't normally happen; safety net)
 *
 * Throws `ForbiddenError` when the member exists but rank is too low for
 * the requested action. Callers should catch and map to the
 * `ActionResult<never>` error shape (or let the throw bubble to Next's error boundary
 * for unexpected permission failures).
 */
export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type MemberGuard = {
  session: Awaited<ReturnType<typeof requireUser>>;
  organizationId: string;
  role: Role;
};

export async function requireMember(
  minRole: Role = "member",
): Promise<MemberGuard> {
  const session = await requireUser();
  // Read activeOrganizationId from DB rather than session — BA doesn't
  // refresh the session when User columns change (e.g., after onboarding
  // auto-creates the user's personal org), so the session copy can be stale.
  // One extra query per authed action is cheap and avoids a redirect loop.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { activeOrganizationId: true },
  });
  const activeOrgId = user?.activeOrganizationId ?? null;
  if (!activeOrgId) {
    redirect("/onboarding/welcome");
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
    // User was removed from the org but User.activeOrganizationId still
    // points there — bounce them to welcome to pick another membership.
    redirect("/onboarding/welcome");
  }
  // Member.role is a free-form string at the DB layer. Validate it through
  // the type guard so downstream callers get a `Role`-typed value without
  // bypassing the union check. Unknown values fall back to "viewer" — the
  // safest possible role — so a corrupt row can't accidentally pass an
  // admin gate. (Realistically only the seeder writes these, but we keep
  // the boundary tight regardless.)
  const role: Role = isRole(member.role) ? member.role : "viewer";
  if (!roleHasAccess(role, minRole)) {
    throw new ForbiddenError(
      `This action requires ${minRole} or higher. You are ${role}.`,
    );
  }
  return { session, organizationId: activeOrgId, role };
}
