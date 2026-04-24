import { describe, expect, it } from "vitest";
import { findByTypeahead, findNextEnabledId } from "./select";

type Option = { id: string; label: string; disabled: boolean };

const opts: Option[] = [
  { id: "a", label: "Apple", disabled: false },
  { id: "b", label: "Banana", disabled: false },
  { id: "c", label: "Cherry", disabled: true },
  { id: "d", label: "Date", disabled: false },
];

describe("findNextEnabledId", () => {
  it("returns first enabled when no current and going forward", () => {
    expect(findNextEnabledId(opts, null, 1)).toBe("a");
  });

  it("returns last enabled when no current and going backward", () => {
    expect(findNextEnabledId(opts, null, -1)).toBe("d");
  });

  it("advances to the next enabled option", () => {
    expect(findNextEnabledId(opts, "a", 1)).toBe("b");
  });

  it("skips disabled options when advancing", () => {
    expect(findNextEnabledId(opts, "b", 1)).toBe("d");
  });

  it("skips disabled options when going backward", () => {
    expect(findNextEnabledId(opts, "d", -1)).toBe("b");
  });

  it("wraps around forward past the end", () => {
    expect(findNextEnabledId(opts, "d", 1)).toBe("a");
  });

  it("wraps around backward past the start", () => {
    expect(findNextEnabledId(opts, "a", -1)).toBe("d");
  });

  it("returns null when the list is empty", () => {
    expect(findNextEnabledId([], null, 1)).toBeNull();
  });

  it("returns null when every option is disabled", () => {
    const allDisabled = opts.map((o) => ({ ...o, disabled: true }));
    expect(findNextEnabledId(allDisabled, null, 1)).toBeNull();
  });
});

describe("findByTypeahead", () => {
  it("returns null for an empty query", () => {
    expect(findByTypeahead(opts, "", null)).toBeNull();
  });

  it("matches a prefix case-insensitively", () => {
    expect(findByTypeahead(opts, "a", null)?.id).toBe("a");
    expect(findByTypeahead(opts, "AP", null)?.id).toBe("a");
  });

  it("starts after the currently active option", () => {
    // Query "d" matches "Date" starting from null; from current="a" still matches "Date".
    expect(findByTypeahead(opts, "d", "a")?.id).toBe("d");
  });

  it("skips disabled options", () => {
    // "c" would match "Cherry" but it's disabled — no enabled prefix match for 'c'.
    expect(findByTypeahead(opts, "c", null)).toBeNull();
  });

  it("wraps past the end when no match after current", () => {
    // current="d" (last), query "a" — should wrap to "a".
    expect(findByTypeahead(opts, "a", "d")?.id).toBe("a");
  });

  it("returns null when no option matches the query", () => {
    expect(findByTypeahead(opts, "z", null)).toBeNull();
  });
});
