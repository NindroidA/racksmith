import { describe, expect, it } from "vitest";
import { parseAuthHeader, isExpired, isRevoked } from "./api-key-auth";

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
