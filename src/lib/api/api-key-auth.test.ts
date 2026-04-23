import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  parseAuthHeader,
  isExpired,
  isRevoked,
  requireApiKey,
} from "./api-key-auth";
import { hashApiKey } from "./api-key-crypto";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
    },
  },
}));

describe("parseAuthHeader", () => {
  it("extracts the bearer token", () => {
    expect(parseAuthHeader("Bearer rs_live_abc")).toBe("rs_live_abc");
  });
  it("returns null for missing header", () => {
    expect(parseAuthHeader(null)).toBeNull();
  });
  it("returns null for wrong scheme", () => {
    expect(parseAuthHeader("Basic dXNlcjpwYXNz")).toBeNull();
  });
  it("returns null for bearer with empty token", () => {
    expect(parseAuthHeader("Bearer ")).toBeNull();
  });
  it("is case-insensitive on the scheme", () => {
    expect(parseAuthHeader("bearer rs_live_x")).toBe("rs_live_x");
    expect(parseAuthHeader("BEARER rs_live_x")).toBe("rs_live_x");
  });
});

describe("isExpired", () => {
  it("false for null expiresAt", () => {
    expect(isExpired(null)).toBe(false);
  });
  it("false for future expiresAt", () => {
    expect(isExpired(new Date(Date.now() + 60_000))).toBe(false);
  });
  it("true for past expiresAt", () => {
    expect(isExpired(new Date(Date.now() - 60_000))).toBe(true);
  });
});

describe("isRevoked", () => {
  it("false for null revokedAt", () => {
    expect(isRevoked(null)).toBe(false);
  });
  it("true for any non-null revokedAt", () => {
    expect(isRevoked(new Date())).toBe(true);
  });
});

// Full-flow integration behavior (Prisma round-trips, RLS engagement) is
// covered in tests/integration/api/*. These unit tests exercise the branch
// logic in requireApiKey with a mocked prisma client.
describe("requireApiKey", () => {
  beforeEach(() => vi.resetAllMocks());

  const mockKey = (overrides: Record<string, unknown> = {}) =>
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "key_1",
      organizationId: "org_1",
      createdByUserId: "user_1",
      role: "admin",
      revokedAt: null,
      expiresAt: null,
      organization: { plan: "pro", planExpiresAt: null },
      ...overrides,
    } as any);

  const bearerReq = (token = "rs_live_abc") =>
    new Request("http://x/api/v1/ping", {
      headers: { Authorization: `Bearer ${token}` },
    });

  it("returns 401 when Authorization header is missing", async () => {
    const req = new Request("http://x/api/v1/ping");
    const result = await requireApiKey(req, "member");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(401);
      expect(result.error.body.error.code).toBe("unauthorized");
    }
  });

  it("returns 401 when the key hash is not found", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null);
    const result = await requireApiKey(bearerReq(), "member");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.status).toBe(401);
  });

  it("returns 401 when the key is revoked", async () => {
    mockKey({ revokedAt: new Date() });
    const result = await requireApiKey(bearerReq(), "member");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.status).toBe(401);
  });

  it("returns 401 when the key is expired", async () => {
    mockKey({ expiresAt: new Date(Date.now() - 60_000) });
    const result = await requireApiKey(bearerReq(), "member");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.status).toBe(401);
  });

  it("returns 403 when the org is on the free tier (no API access)", async () => {
    mockKey({ organization: { plan: "free", planExpiresAt: null } });
    const result = await requireApiKey(bearerReq(), "member");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      expect(result.error.body.error.code).toBe("forbidden");
    }
  });

  it("downgrades an expired paid plan to free and returns 403", async () => {
    mockKey({
      organization: {
        plan: "pro",
        planExpiresAt: new Date(Date.now() - 60_000),
      },
    });
    const result = await requireApiKey(bearerReq(), "member");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.status).toBe(403);
  });

  it("returns 403 when the key role is below the required role", async () => {
    mockKey({ role: "member" });
    const result = await requireApiKey(bearerReq(), "admin");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      expect(result.error.body.error.code).toBe("forbidden");
    }
  });

  it("returns the auth ctx on happy path (member key + member endpoint)", async () => {
    mockKey({ role: "member" });
    const result = await requireApiKey(bearerReq(), "member");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ctx).toEqual({
        organizationId: "org_1",
        userId: "user_1",
        role: "member",
        plan: "pro",
        apiKeyId: "key_1",
      });
    }
  });

  it("hashes the bearer token before lookup (never the cleartext)", async () => {
    mockKey();
    await requireApiKey(bearerReq("rs_live_secret"), "member");
    expect(prisma.apiKey.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { hash: hashApiKey("rs_live_secret") },
      }),
    );
  });
});
