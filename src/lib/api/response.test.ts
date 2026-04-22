import { describe, expect, it } from "vitest";
import {
  apiError,
  jsonResponse,
  rateLimitHeaders,
  API_ERROR_CODES,
} from "./response";

describe("apiError", () => {
  it("builds the RFC 7807-ish envelope", () => {
    const err = apiError("not_found", "Rack not found", 404);
    expect(err).toEqual({
      status: 404,
      body: {
        error: {
          code: "not_found",
          message: "Rack not found",
          fields: [],
          requestId: "",
        },
      },
    });
  });
  it("attaches field errors", () => {
    const err = apiError("validation_failed", "Invalid input", 400, [
      { path: "name", message: "Required" },
    ]);
    expect(err.body.error.fields).toHaveLength(1);
  });
});

describe("jsonResponse", () => {
  it("returns a Response with application/json + requestId header", () => {
    const res = jsonResponse({ ok: true }, 200, "req_123", {
      limit: 120,
      remaining: 119,
      resetAt: 1704067260,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("X-Request-Id")).toBe("req_123");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("120");
  });
});

describe("rateLimitHeaders", () => {
  it("emits Retry-After only when remaining <= 0", () => {
    const over = rateLimitHeaders({ limit: 120, remaining: 0, resetAt: 1704067260 });
    expect(over["Retry-After"]).toBeDefined();
    const under = rateLimitHeaders({ limit: 120, remaining: 5, resetAt: 1704067260 });
    expect(under["Retry-After"]).toBeUndefined();
  });
});

describe("API_ERROR_CODES", () => {
  it("includes all codes referenced in the spec", () => {
    const required = [
      "unauthorized",
      "forbidden",
      "tier_limit_reached",
      "rate_limit_exceeded",
      "validation_failed",
      "not_found",
      "conflict",
      "unsupported_media_type",
      "internal_error",
    ];
    for (const code of required) {
      expect(API_ERROR_CODES).toContain(code);
    }
  });
});
