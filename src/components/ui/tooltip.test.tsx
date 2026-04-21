import { describe, expect, it } from "vitest";
import { GLOSSARY, getGlossaryEntry } from "@/lib/networking-glossary";

describe("networking glossary", () => {
  it("every entry has a short definition under 120 chars", () => {
    for (const [key, entry] of Object.entries(GLOSSARY)) {
      expect(
        entry.short.length,
        `${key} short is too long`,
      ).toBeLessThanOrEqual(120);
      expect(entry.term.length, `${key} term missing`).toBeGreaterThan(0);
    }
  });

  it("getGlossaryEntry handles case-insensitive + punctuation-tolerant lookups", () => {
    expect(getGlossaryEntry("vlan")?.term).toBe("VLAN");
    expect(getGlossaryEntry("VLAN")?.term).toBe("VLAN");
    expect(getGlossaryEntry("rack-unit")?.term).toBe("U (rack unit)");
    expect(getGlossaryEntry("poe")?.term).toBe("PoE");
    expect(getGlossaryEntry("unknown-term")).toBeUndefined();
  });
});
