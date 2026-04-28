import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the modules `auth-helpers` reads from. Hoisted by Vitest, so the
// vi.fn handles inside come back via the imports in the test bodies.
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  // Real next/navigation throws a sentinel error to short-circuit RSC. The
  // mock throws a plain Error tagged with the destination so tests can
  // assert *what* redirect was attempted without pulling in the real
  // implementation.
  redirect: vi.fn((dest: string) => {
    const e = new Error(`__redirect__:${dest}`);
    (e as Error & { __redirect: string }).__redirect = dest;
    throw e;
  }),
}));

vi.mock("./auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("./prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    member: { findUnique: vi.fn() },
  },
}));

import { auth } from "./auth";
import { prisma } from "./prisma";
import { ForbiddenError, requireMember, requireUser } from "./auth-helpers";

beforeEach(() => {
  vi.clearAllMocks();
});

const session = (overrides: { userId?: string } = {}) => ({
  user: { id: overrides.userId ?? "user_1" },
});

const expectRedirect = async (
  fn: () => Promise<unknown>,
  destination: string,
) => {
  await expect(fn).rejects.toMatchObject({ __redirect: destination });
};

describe("requireUser", () => {
  it("redirects to /login when no session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    await expectRedirect(() => requireUser(), "/login");
  });

  it("redirects to /login when session has no user", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({} as never);
    await expectRedirect(() => requireUser(), "/login");
  });

  it("returns the session when authenticated", async () => {
    const s = session();
    vi.mocked(auth.api.getSession).mockResolvedValue(s as never);
    await expect(requireUser()).resolves.toBe(s);
  });
});

describe("requireMember", () => {
  it("redirects to /login when no session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    await expectRedirect(() => requireMember(), "/login");
  });

  it("redirects to /onboarding/welcome when user has no active org", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(session() as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      activeOrganizationId: null,
    } as never);
    await expectRedirect(() => requireMember(), "/onboarding/welcome");
  });

  it("redirects to /onboarding/welcome when active-org points at a non-membership", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(session() as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      activeOrganizationId: "org_1",
    } as never);
    vi.mocked(prisma.member.findUnique).mockResolvedValue(null);
    await expectRedirect(() => requireMember(), "/onboarding/welcome");
  });

  it("throws ForbiddenError when role is below minRole", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(session() as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      activeOrganizationId: "org_1",
    } as never);
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      role: "viewer",
    } as never);
    await expect(requireMember("admin")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns guard when role meets minRole", async () => {
    const s = session();
    vi.mocked(auth.api.getSession).mockResolvedValue(s as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      activeOrganizationId: "org_1",
    } as never);
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      role: "owner",
    } as never);
    const result = await requireMember("admin");
    expect(result).toEqual({
      session: s,
      organizationId: "org_1",
      role: "owner",
    });
  });

  it("falls back to 'viewer' when member.role is corrupt / unrecognized", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(session() as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      activeOrganizationId: "org_1",
    } as never);
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      role: "superuser", // not in the canonical set
    } as never);
    const result = await requireMember("viewer");
    expect(result.role).toBe("viewer");
    // And of course it should reject any role above viewer.
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      role: "superuser",
    } as never);
    await expect(requireMember("member")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("reads activeOrganizationId fresh from DB (not from session)", async () => {
    // Even though the session has no activeOrganizationId field,
    // requireMember should hit the DB and pick up "org_42".
    vi.mocked(auth.api.getSession).mockResolvedValue(session() as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      activeOrganizationId: "org_42",
    } as never);
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      role: "member",
    } as never);
    const result = await requireMember();
    expect(result.organizationId).toBe("org_42");
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_1" },
        select: { activeOrganizationId: true },
      }),
    );
  });
});

describe("ForbiddenError", () => {
  it("has the right name and default message", () => {
    const e = new ForbiddenError();
    expect(e.name).toBe("ForbiddenError");
    expect(e.message).toBe("Forbidden");
    expect(e).toBeInstanceOf(Error);
  });

  it("preserves a custom message", () => {
    const e = new ForbiddenError("This action requires admin or higher.");
    expect(e.message).toBe("This action requires admin or higher.");
  });
});
