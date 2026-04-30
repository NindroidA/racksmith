import { describe, expect, it } from "vitest";

import { sanitizeNextPath } from "./safe-next-path";

describe("sanitizeNextPath", () => {
  it("returns same-origin paths unchanged", () => {
    expect(sanitizeNextPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("/settings/billing?tier=pro")).toBe(
      "/settings/billing?tier=pro",
    );
  });

  it("falls back when undefined or empty", () => {
    expect(sanitizeNextPath(undefined)).toBe("/dashboard");
    expect(sanitizeNextPath("")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeNextPath("//evil.example/path")).toBe("/dashboard");
    expect(sanitizeNextPath("//evil.example")).toBe("/dashboard");
  });

  it("rejects absolute URLs", () => {
    expect(sanitizeNextPath("https://evil.example/path")).toBe("/dashboard");
    expect(sanitizeNextPath("http://localhost/x")).toBe("/dashboard");
    expect(sanitizeNextPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("rejects backslash sneak-in (browser path normalization)", () => {
    expect(sanitizeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(sanitizeNextPath("/x\\y")).toBe("/dashboard");
  });

  it("rejects paths with whitespace", () => {
    expect(sanitizeNextPath("/dashboard ")).toBe("/dashboard");
    expect(sanitizeNextPath("/ d")).toBe("/dashboard");
    expect(sanitizeNextPath("/d\nashboard")).toBe("/dashboard");
  });

  it("rejects oversize values to bound query parsing cost", () => {
    expect(sanitizeNextPath("/" + "a".repeat(600))).toBe("/dashboard");
  });

  it("uses the provided fallback when given", () => {
    expect(sanitizeNextPath(undefined, "/login")).toBe("/login");
    expect(sanitizeNextPath("//evil", "/login")).toBe("/login");
  });
});
