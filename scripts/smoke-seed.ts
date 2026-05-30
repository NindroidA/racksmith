/**
 * Phase 13 smoke-test seed.
 *
 * Creates fresh users + orgs for each test phase. Idempotent — re-running
 * removes the previous smoke fixtures first (every email has the
 * `smoke-` prefix so the truncation pattern is safe). Runs against the
 * dev DB on localhost:5432.
 *
 * Strategy: register users by POSTing to /api/auth/sign-up/email so
 * Better Auth handles password hashing correctly. Then DB-flip
 * `emailVerified` and create the Organization + Member graph directly
 * via Prisma (mirroring what onboarding/welcome does).
 *
 * Output: JSON dump of all created entities to /tmp/racksmith-smoke/seed.json
 * for the Playwright script to read.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const PASSWORD = process.env.SMOKE_PASSWORD ?? "SmokeTest123!Pass";
const prisma = new PrismaClient();

type Seeded = {
  user: { id: string; email: string; name: string };
  org?: { id: string; name: string; slug: string };
  role?: "owner" | "admin" | "member" | "viewer";
  password: string;
};

async function purgePreviousFixtures(): Promise<void> {
  // All smoke fixtures use the `smoke-*` email prefix. Cascade delete
  // through Member/Organization first to avoid FK violations.
  const users = await prisma.user.findMany({
    where: { email: { startsWith: "smoke-" } },
    select: { id: true, email: true },
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return;

  // Find every org these users own/belong to so we can also delete those.
  const memberships = await prisma.member.findMany({
    where: { userId: { in: userIds } },
    select: { organizationId: true },
  });
  const orgIds = Array.from(new Set(memberships.map((m) => m.organizationId)));

  // Wipe in dependency order. Use transactions to keep it tidy.
  await prisma.$transaction(async (tx) => {
    if (orgIds.length > 0) {
      await tx.auditLog.deleteMany({
        where: { organizationId: { in: orgIds } },
      });
      await tx.stripeEvent.deleteMany({
        where: { organizationId: { in: orgIds } },
      });
      await tx.invitation.deleteMany({
        where: { organizationId: { in: orgIds } },
      });
      await tx.member.deleteMany({
        where: { organizationId: { in: orgIds } },
      });
      await tx.organization.deleteMany({
        where: { id: { in: orgIds } },
      });
    }
    await tx.session.deleteMany({ where: { userId: { in: userIds } } });
    await tx.account.deleteMany({ where: { userId: { in: userIds } } });
    await tx.verification.deleteMany({
      where: { identifier: { in: users.map((u) => u.email) } },
    });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });
}

async function registerUser(opts: {
  email: string;
  name: string;
}): Promise<{ id: string; email: string; name: string }> {
  // Create the User + credential Account directly via Prisma using
  // Better Auth's own hashPassword so /sign-in/email accepts the
  // credential later. Bypassing the BA HTTP sign-up endpoint avoids
  // the /sign-up/email rate limit (3 per hour) we'd otherwise hit
  // seeding 5+ users in a row.
  const userId = randomUUID();
  const accountId = randomUUID();
  const hashed = await hashPassword(PASSWORD);
  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        email: opts.email,
        name: opts.name,
        emailVerified: false,
      },
    });
    await tx.account.create({
      data: {
        id: accountId,
        userId,
        providerId: "credential",
        accountId: userId,
        password: hashed,
      },
    });
  });
  return { id: userId, email: opts.email, name: opts.name };
}

async function verifyEmail(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true, profileCompletedAt: new Date() },
  });
}

async function createOrgWithOwner(opts: {
  user: { id: string };
  name: string;
  slug: string;
}): Promise<{ id: string; name: string; slug: string }> {
  // Mirror what `src/app/onboarding/welcome/page.tsx` does: create the
  // org + owner Member in one transaction.
  const created = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: opts.name,
        slug: opts.slug,
        plan: "free",
        members: {
          create: {
            userId: opts.user.id,
            role: "owner",
          },
        },
      },
    });
    await tx.user.update({
      where: { id: opts.user.id },
      data: { activeOrganizationId: org.id },
    });
    return org;
  });
  return { id: created.id, name: created.name, slug: created.slug };
}

async function addMemberToOrg(opts: {
  orgId: string;
  userId: string;
  role: "admin" | "member" | "viewer";
}): Promise<void> {
  await prisma.member.create({
    data: {
      organizationId: opts.orgId,
      userId: opts.userId,
      role: opts.role,
    },
  });
  // Also set this org as the user's active org so they land in it on sign-in.
  await prisma.user.update({
    where: { id: opts.userId },
    data: { activeOrganizationId: opts.orgId },
  });
}

async function main(): Promise<void> {
  await purgePreviousFixtures();

  const seeded: Record<string, Seeded> = {};

  // ── Pro happy path: nothing to pre-seed; we'll register via UI ─────
  // (Phase 2 uses a fresh smoke-pro-{timestamp}@racksmith.test through
  // the actual /register form to exercise the real signup flow.)

  // ── Business + seat sync (Phase 4): pre-seed an admin + a member ──
  const bizAdminEmail = "smoke-biz-admin@racksmith.test";
  const bizAdmin = await registerUser({
    email: bizAdminEmail,
    name: "Smoke Biz Admin",
  });
  await verifyEmail(bizAdmin.id);
  const bizOrg = await createOrgWithOwner({
    user: bizAdmin,
    name: "Smoke Business Org",
    slug: `smoke-biz-${Date.now().toString(36)}`,
  });
  seeded.bizAdmin = {
    user: bizAdmin,
    org: bizOrg,
    role: "owner",
    password: PASSWORD,
  };

  const bizInviteeEmail = "smoke-biz-invitee@racksmith.test";
  const bizInvitee = await registerUser({
    email: bizInviteeEmail,
    name: "Smoke Biz Invitee",
  });
  await verifyEmail(bizInvitee.id);
  seeded.bizInvitee = { user: bizInvitee, password: PASSWORD };

  // ── Negative auth (Phase 5) ───────────────────────────────────────
  // Same org with admin/member/viewer + an unverified-email admin.
  const negAdmin = await registerUser({
    email: "smoke-neg-admin@racksmith.test",
    name: "Smoke Neg Admin",
  });
  await verifyEmail(negAdmin.id);
  const negOrg = await createOrgWithOwner({
    user: negAdmin,
    name: "Smoke Negative Org",
    slug: `smoke-neg-${Date.now().toString(36)}`,
  });

  const negMember = await registerUser({
    email: "smoke-neg-member@racksmith.test",
    name: "Smoke Neg Member",
  });
  await verifyEmail(negMember.id);
  await addMemberToOrg({
    orgId: negOrg.id,
    userId: negMember.id,
    role: "member",
  });

  const negUnverified = await registerUser({
    email: "smoke-neg-unverified@racksmith.test",
    name: "Smoke Unverified Admin",
  });
  // Intentionally do NOT verify this one. Still complete onboarding +
  // give them an admin role in a separate org so they can reach the
  // billing page and we can see the verify-email gate.
  await prisma.user.update({
    where: { id: negUnverified.id },
    data: { profileCompletedAt: new Date() },
  });
  const unverifiedOrg = await createOrgWithOwner({
    user: negUnverified,
    name: "Smoke Unverified Org",
    slug: `smoke-unv-${Date.now().toString(36)}`,
  });

  seeded.negAdmin = {
    user: negAdmin,
    org: negOrg,
    role: "owner",
    password: PASSWORD,
  };
  seeded.negMember = {
    user: negMember,
    org: negOrg,
    role: "member",
    password: PASSWORD,
  };
  seeded.negUnverified = {
    user: negUnverified,
    org: unverifiedOrg,
    role: "owner",
    password: PASSWORD,
  };

  // ── Persist for the Playwright runner to consume ──────────────────
  mkdirSync("/tmp/racksmith-smoke", { recursive: true });
  writeFileSync(
    "/tmp/racksmith-smoke/seed.json",
    JSON.stringify({ password: PASSWORD, seeded }, null, 2),
  );

  console.log("Seeded:");
  for (const [k, v] of Object.entries(seeded)) {
    console.log(
      `  ${k}: ${v.user.email}  (${v.org?.name ?? "(no org)"}) role=${v.role ?? "-"}`,
    );
  }
  console.log(`\nWrote /tmp/racksmith-smoke/seed.json`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
