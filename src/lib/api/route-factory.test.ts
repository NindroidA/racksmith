import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApiRoute } from "./route-factory";
import * as authModule from "./api-key-auth";
import * as sessionAuthModule from "./session-auth";
import * as rateLimitModule from "./rate-limit";

vi.mock("./api-key-auth");
vi.mock("./session-auth");
vi.mock("./rate-limit");
vi.mock("@/lib/prisma-tenant", () => ({
  withTenant: vi.fn((_, fn) => fn({})),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

const mockSessionOk = (overrides = {}) => {
  vi.mocked(sessionAuthModule.requireSessionMember).mockResolvedValue({
    ok: true,
    ctx: {
      organizationId: "org_1",
      userId: "user_1",
      role: "member",
      // Tests don't read session contents; cast keeps the mock concise.
      session: {} as unknown as Awaited<
        ReturnType<typeof sessionAuthModule.requireSessionMember>
      > extends { ok: true; ctx: { session: infer S } }
        ? S
        : never,
      ...overrides,
    },
  });
};

const mockAuthOk = (overrides = {}) => {
  vi.mocked(authModule.requireApiKey).mockResolvedValue({
    ok: true,
    ctx: {
      organizationId: "org_1",
      userId: "user_1",
      role: "admin",
      plan: "pro",
      apiKeyId: "key_1",
      ...overrides,
    },
  });
};

const mockRateOk = () => {
  vi.mocked(rateLimitModule.checkAndRecord).mockResolvedValue({
    allowed: true,
    used: 1,
    remaining: 119,
    resetAt: Math.floor(Date.now() / 1000) + 60,
  });
};

describe("createApiRoute", () => {
  // Clear call history between tests so `.not.toHaveBeenCalled()` assertions
  // in the auth-mode suites only see calls from their own test.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 on missing auth header", async () => {
    vi.mocked(authModule.requireApiKey).mockResolvedValue({
      ok: false,
      error: {
        status: 401,
        body: {
          error: {
            code: "unauthorized",
            message: "x",
            fields: [],
            requestId: "",
          },
        },
      },
    });
    const handler = createApiRoute({
      method: "GET",
      auth: "member",
      responseSchema: z.object({ ok: z.boolean() }),
      summary: "ping",
      handler: async () => ({ ok: true }),
    });
    const res = await handler(new Request("http://x/api/v1/ping"), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("unauthorized");
    expect(res.headers.get("X-Request-Id")).toBeTruthy();
  });

  it("returns 415 on wrong Content-Type for POST", async () => {
    mockAuthOk();
    mockRateOk();
    const handler = createApiRoute({
      method: "POST",
      auth: "member",
      bodySchema: z.object({ name: z.string() }).strict(),
      responseSchema: z.object({ id: z.string() }),
      summary: "create",
      handler: async () => ({ id: "x" }),
    });
    const req = new Request("http://x/api/v1/racks", {
      method: "POST",
      headers: {
        Authorization: "Bearer rs_live_x",
        "Content-Type": "text/plain",
      },
      body: "name=foo",
    });
    const res = await handler(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(415);
  });

  it("rejects unknown keys via .strict() schema", async () => {
    mockAuthOk();
    mockRateOk();
    const handler = createApiRoute({
      method: "POST",
      auth: "member",
      bodySchema: z.object({ name: z.string() }).strict(),
      responseSchema: z.object({ ok: z.boolean() }),
      summary: "create",
      handler: async () => ({ ok: true }),
    });
    const req = new Request("http://x/api/v1/racks", {
      method: "POST",
      headers: {
        Authorization: "Bearer rs_live_x",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "x", organizationId: "attacker" }),
    });
    const res = await handler(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("validation_failed");
  });

  it("strips non-whitelisted response fields", async () => {
    mockAuthOk();
    mockRateOk();
    const handler = createApiRoute({
      method: "GET",
      auth: "member",
      responseSchema: z.object({ id: z.string(), name: z.string() }),
      summary: "fetch",
      handler: async () =>
        ({ id: "r1", name: "rack1", hash: "SECRET", userId: "leak" }) as any,
    });
    const req = new Request("http://x/api/v1/racks/r1", {
      headers: { Authorization: "Bearer rs_live_x" },
    });
    const res = await handler(req, { params: Promise.resolve({ id: "r1" }) });
    const body = await res.json();
    expect(body.rack ?? body).not.toHaveProperty("hash");
    expect(body.rack ?? body).not.toHaveProperty("userId");
  });

  it("returns 429 when rate-limit denies", async () => {
    mockAuthOk();
    vi.mocked(rateLimitModule.checkAndRecord).mockResolvedValue({
      allowed: false,
      used: 120,
      remaining: 0,
      resetAt: Math.floor(Date.now() / 1000) + 60,
    });
    const handler = createApiRoute({
      method: "GET",
      auth: "member",
      responseSchema: z.object({ ok: z.boolean() }),
      summary: "ping",
      handler: async () => ({ ok: true }),
    });
    const req = new Request("http://x/api/v1/ping", {
      headers: { Authorization: "Bearer rs_live_x" },
    });
    const res = await handler(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("attaches X-RateLimit-* headers on success", async () => {
    mockAuthOk();
    mockRateOk();
    const handler = createApiRoute({
      method: "GET",
      auth: "member",
      responseSchema: z.object({ ok: z.boolean() }),
      summary: "ping",
      handler: async () => ({ ok: true }),
    });
    const req = new Request("http://x/api/v1/ping", {
      headers: { Authorization: "Bearer rs_live_x" },
    });
    const res = await handler(req, { params: Promise.resolve({}) });
    expect(res.headers.get("X-RateLimit-Limit")).toBe("120");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("119");
  });

  describe("auth: 'public'", () => {
    it("invokes the handler with no auth header and no rate limit", async () => {
      const handler = createApiRoute({
        method: "GET",
        auth: "public",
        responseSchema: z.object({ status: z.string() }),
        summary: "health",
        handler: async () => ({ status: "ok" }),
      });
      const res = await handler(new Request("http://x/api/health"), {
        params: Promise.resolve({}),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: "ok" });
      expect(res.headers.get("X-Request-Id")).toBeTruthy();
      // No rate-limit work happens for public mode.
      expect(res.headers.get("X-RateLimit-Limit")).toBeNull();
      expect(vi.mocked(authModule.requireApiKey)).not.toHaveBeenCalled();
      expect(vi.mocked(rateLimitModule.checkAndRecord)).not.toHaveBeenCalled();
    });
  });

  describe("auth: 'session-member' / 'session-admin'", () => {
    it("returns 401 when session helper denies", async () => {
      vi.mocked(sessionAuthModule.requireSessionMember).mockResolvedValue({
        ok: false,
        error: {
          status: 401,
          body: {
            error: {
              code: "unauthorized",
              message: "no session",
              fields: [],
              requestId: "",
            },
          },
        },
      });
      const handler = createApiRoute({
        method: "GET",
        auth: "session-member",
        responseSchema: z.object({ ok: z.boolean() }),
        summary: "internal",
        handler: async () => ({ ok: true }),
      });
      const res = await handler(new Request("http://x/api/audit/export"), {
        params: Promise.resolve({}),
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("unauthorized");
      // Session-mode never engages API-key rate limiting.
      expect(vi.mocked(rateLimitModule.checkAndRecord)).not.toHaveBeenCalled();
    });

    it("invokes the handler with the resolved SessionAuthContext", async () => {
      mockSessionOk();
      const seenCtx: { organizationId: string; userId: string }[] = [];
      const handler = createApiRoute({
        method: "GET",
        auth: "session-member",
        responseSchema: z.object({ ok: z.boolean() }),
        summary: "internal",
        handler: async ({ ctx }) => {
          seenCtx.push({
            organizationId: ctx.organizationId,
            userId: ctx.userId,
          });
          return { ok: true };
        },
      });
      const res = await handler(new Request("http://x/api/audit/export"), {
        params: Promise.resolve({}),
      });
      expect(res.status).toBe(200);
      expect(seenCtx).toEqual([{ organizationId: "org_1", userId: "user_1" }]);
      expect(vi.mocked(rateLimitModule.checkAndRecord)).not.toHaveBeenCalled();
    });
  });

  describe("responseShape: 'passthrough'", () => {
    it("passes the handler's Response through untouched, attaching X-Request-Id", async () => {
      const handler = createApiRoute({
        method: "GET",
        auth: "public",
        responseShape: "passthrough",
        summary: "csv export",
        handler: async () =>
          new Response("col\nrow", {
            status: 200,
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": "attachment; filename=data.csv",
            },
          }),
      });
      const res = await handler(new Request("http://x/api/audit/export"), {
        params: Promise.resolve({}),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/csv");
      expect(res.headers.get("Content-Disposition")).toBe(
        "attachment; filename=data.csv",
      );
      expect(res.headers.get("X-Request-Id")).toBeTruthy();
      expect(await res.text()).toBe("col\nrow");
    });

    it("preserves a non-200 status returned by the handler (e.g. 503)", async () => {
      const handler = createApiRoute({
        method: "GET",
        auth: "public",
        responseShape: "passthrough",
        summary: "health",
        handler: async () =>
          new Response(JSON.stringify({ status: "down" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }),
      });
      const res = await handler(new Request("http://x/api/health"), {
        params: Promise.resolve({}),
      });
      expect(res.status).toBe(503);
      expect((await res.json()).status).toBe("down");
    });

    it("ApiError short-circuit still wins over passthrough Response", async () => {
      mockSessionOk();
      const handler = createApiRoute({
        method: "GET",
        auth: "session-member",
        responseShape: "passthrough",
        summary: "tier-gated",
        handler: async () => ({
          status: 403,
          body: {
            error: {
              code: "tier_limit_reached" as const,
              message: "Free tier can't export",
              fields: [],
              requestId: "",
            },
          },
        }),
      });
      const res = await handler(new Request("http://x/api/audit/export"), {
        params: Promise.resolve({}),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("tier_limit_reached");
    });
  });
});
