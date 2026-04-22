import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApiRoute } from "./route-factory";
import * as authModule from "./api-key-auth";
import * as rateLimitModule from "./rate-limit";

vi.mock("./api-key-auth");
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
});
