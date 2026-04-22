import { describe, expect, it } from "vitest";
import {
  API_KEY_PREFIX,
  API_KEY_PREFIX_LENGTH,
  generateApiKey,
  hashApiKey,
  extractKeyPrefix,
} from "./api-key-crypto";

describe("api-key-crypto", () => {
  describe("generateApiKey", () => {
    it("returns a key starting with rs_live_", () => {
      const { cleartext } = generateApiKey();
      expect(cleartext.startsWith(API_KEY_PREFIX)).toBe(true);
    });
    it("returns a key of the expected length (51 chars)", () => {
      const { cleartext } = generateApiKey();
      expect(cleartext.length).toBe(51);
    });
    it("returns a prefix of the expected length (12 chars)", () => {
      const { prefix } = generateApiKey();
      expect(prefix.length).toBe(API_KEY_PREFIX_LENGTH);
    });
    it("returns matching hash + cleartext pair", () => {
      const { cleartext, hash } = generateApiKey();
      expect(hashApiKey(cleartext)).toBe(hash);
    });
    it("generates unique keys", () => {
      const a = generateApiKey();
      const b = generateApiKey();
      expect(a.cleartext).not.toBe(b.cleartext);
    });
  });
  describe("hashApiKey", () => {
    it("returns a 64-char hex string", () => {
      const h = hashApiKey("rs_live_abcdef");
      expect(h).toMatch(/^[a-f0-9]{64}$/);
    });
    it("is deterministic", () => {
      expect(hashApiKey("rs_live_x")).toBe(hashApiKey("rs_live_x"));
    });
  });
  describe("extractKeyPrefix", () => {
    it("returns the first 12 chars", () => {
      const full = "rs_live_abcdefghijklmnop";
      expect(extractKeyPrefix(full)).toBe("rs_live_abcd");
    });
    it("handles short inputs (no panic)", () => {
      expect(extractKeyPrefix("rs_live_")).toBe("rs_live_");
    });
  });
});
