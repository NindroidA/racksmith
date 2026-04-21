import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { roleHasAccess, type Role } from "./permissions";

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
 * API-route counterpart to `requireUser`. Returns either the session or a
 * `NextResponse` 401 — never redirects, since fetch-style API consumers
 * expect JSON, not a 307 to /login.
 *
 * Usage:
 *   const guard = await requireApiUser();
 *   if (guard instanceof NextResponse) return guard;
 *   const session = guard;
 */
export async function requireApiUser() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const role = member.role as Role;
  if (!roleHasAccess(role, minRole)) {
    throw new ForbiddenError(
      `This action requires ${minRole} or higher. You are ${role}.`,
    );
  }
  return { session, organizationId: activeOrgId, role };
}

/**
 * API-route counterpart to `requireMember`. Returns either the guard object or
 * a `NextResponse` 401/403.
 */
export async function requireApiMember(minRole: Role = "member") {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { activeOrganizationId: true },
  });
  const activeOrgId = user?.activeOrganizationId ?? null;
  if (!activeOrgId) {
    return NextResponse.json(
      { error: "No active organization" },
      { status: 403 },
    );
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
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }
  const role = member.role as Role;
  if (!roleHasAccess(role, minRole)) {
    return NextResponse.json(
      { error: `This action requires ${minRole} or higher.` },
      { status: 403 },
    );
  }
  return { session, organizationId: activeOrgId, role } satisfies MemberGuard;
}
