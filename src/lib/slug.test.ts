import { describe, expect, it } from "vitest";
import { generateSlugFromName, isReservedSlug, validateSlug } from "./slug";

describe("validateSlug — RFC-1035-ish format check", () => {
  it("returns null for valid lowercase alphanumeric + hyphen slugs", () => {
    expect(validateSlug("acme")).toBeNull();
    expect(validateSlug("acme-corp")).toBeNull();
    expect(validateSlug("acme-corp-1")).toBeNull();
    expect(validateSlug("a1")).toBeNull();
  });
  it("rejects slugs shorter than 2 characters", () => {
    expect(validateSlug("a")).toMatch(/at least 2 characters/);
    expect(validateSlug("")).toMatch(/at least 2 characters/);
  });
  it("rejects slugs longer than 63 characters", () => {
    expect(validateSlug("a".repeat(64))).toMatch(/63 characters or fewer/);
  });
  it("accepts slugs at exactly 63 chars", () => {
    expect(validateSlug("a".repeat(63))).toBeNull();
  });
  it("rejects uppercase letters", () => {
    expect(validateSlug("Acme")).toMatch(/lowercase/);
  });
  it("rejects leading or trailing hyphens", () => {
    expect(validateSlug("-acme")).toMatch(/no leading\/trailing hyphen/);
    expect(validateSlug("acme-")).toMatch(/no leading\/trailing hyphen/);
  });
  it("rejects underscores and other punctuation", () => {
    expect(validateSlug("acme_corp")).toMatch(/lowercase/);
    expect(validateSlug("acme.corp")).toMatch(/lowercase/);
    expect(validateSlug("acme corp")).toMatch(/lowercase/);
  });
  it("trims surrounding whitespace before validating", () => {
    expect(validateSlug("  acme  ")).toBeNull();
    // leading-hyphen check still fires after trim
    expect(validateSlug("  -acme  ")).toMatch(/leading\/trailing hyphen/);
  });
  it("rejects reserved system slugs (route + future-proof list)", () => {
    expect(validateSlug("settings")).toMatch(/reserved/);
    expect(validateSlug("api")).toMatch(/reserved/);
    expect(validateSlug("admin")).toMatch(/reserved/);
    expect(validateSlug("dashboard")).toMatch(/reserved/);
    expect(validateSlug("billing")).toMatch(/reserved/);
    expect(validateSlug("users")).toMatch(/reserved/);
  });
  it("non-reserved slug that happens to start with reserved prefix still validates", () => {
    // Reservation is whole-string match, not prefix.
    expect(validateSlug("api-team")).toBeNull();
    expect(validateSlug("settings-app")).toBeNull();
  });
});

describe("isReservedSlug", () => {
  it("matches the canonical blocklist", () => {
    expect(isReservedSlug("settings")).toBe(true);
    expect(isReservedSlug("api")).toBe(true);
  });
  it("returns false for non-reserved slugs", () => {
    expect(isReservedSlug("acme")).toBe(false);
    expect(isReservedSlug("custom-org")).toBe(false);
  });
  it("trims before comparing", () => {
    expect(isReservedSlug("  settings  ")).toBe(true);
  });
});

describe("generateSlugFromName", () => {
  it("lowercases and joins ASCII names with hyphens", () => {
    expect(generateSlugFromName("Acme Corp", "abc123")).toBe("acme-corp-abc123");
  });
  it("strips diacritics via NFKD normalization", () => {
    expect(generateSlugFromName("Café Société", "x1")).toBe(
      "cafe-societe-x1",
    );
  });
  it("collapses runs of non-alphanumeric to a single hyphen", () => {
    expect(generateSlugFromName("Foo!!!Bar///Baz", "x1")).toBe(
      "foo-bar-baz-x1",
    );
  });
  it("strips leading + trailing hyphens introduced by punctuation", () => {
    expect(generateSlugFromName("***Acme***", "x1")).toBe("acme-x1");
  });
  it("truncates the base to 50 characters before appending suffix", () => {
    const longName = "a".repeat(80);
    const result = generateSlugFromName(longName, "x1");
    // 50 a's + "-" + "x1"
    expect(result).toBe("a".repeat(50) + "-x1");
  });
  it("falls back to 'org' when the cleaned name is too short", () => {
    expect(generateSlugFromName("", "x1")).toBe("org-x1");
    expect(generateSlugFromName("!", "x1")).toBe("org-x1");
    expect(generateSlugFromName("a", "x1")).toBe("org-x1");
  });
  it("preserves digits in the cleaned base", () => {
    expect(generateSlugFromName("Foo 2025", "x1")).toBe("foo-2025-x1");
  });
});
