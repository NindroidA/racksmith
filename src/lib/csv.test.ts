import { describe, expect, it } from "vitest";
import { csvSafeCell, csvToDeviceRows, parseCsv } from "./csv";

describe("csvSafeCell — formula injection (CWE-1236) defense", () => {
  it("renders null and undefined as empty strings", () => {
    expect(csvSafeCell(null)).toBe("");
    expect(csvSafeCell(undefined)).toBe("");
  });
  it("passes plain numbers and strings through untouched", () => {
    expect(csvSafeCell(42)).toBe("42");
    expect(csvSafeCell("hello")).toBe("hello");
  });
  it("apostrophe-prefixes cells starting with =", () => {
    expect(csvSafeCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
  });
  it("apostrophe-prefixes cells starting with +", () => {
    expect(csvSafeCell("+1+1")).toBe("'+1+1");
  });
  it("apostrophe-prefixes cells starting with -", () => {
    expect(csvSafeCell("-cmd|calc.exe")).toBe("'-cmd|calc.exe");
  });
  it("apostrophe-prefixes cells starting with @", () => {
    expect(csvSafeCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
  it("apostrophe-prefixes cells starting with TAB", () => {
    expect(csvSafeCell("\tEvil")).toBe("'\tEvil");
  });
  it("apostrophe-prefixes cells starting with CR (and RFC-quotes them)", () => {
    // CR matches both the formula-prefix check (so apostrophe goes on) AND
    // the quoting-trigger character class — so the cell ends up wrapped in
    // double-quotes too.
    expect(csvSafeCell("\rEvil")).toBe('"\'\rEvil"');
  });
  it("does not prefix when the dangerous character appears mid-cell", () => {
    expect(csvSafeCell("a=b")).toBe("a=b");
    expect(csvSafeCell("ok+1")).toBe("ok+1");
  });
  it("RFC 4180 quotes cells that contain commas", () => {
    expect(csvSafeCell("a, b")).toBe('"a, b"');
  });
  it("RFC 4180 quotes + escapes embedded double quotes", () => {
    expect(csvSafeCell('say "hi"')).toBe('"say ""hi"""');
  });
  it("RFC 4180 quotes cells containing newline / CR mid-string", () => {
    // No formula prefix because the dangerous char isn't at index 0;
    // only the RFC-4180 quoting wraps the cell.
    expect(csvSafeCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvSafeCell("line1\rline2")).toBe('"line1\rline2"');
  });
  it("combines formula-prefix + RFC 4180 quoting when both apply", () => {
    expect(csvSafeCell('=A1+",foo"')).toBe('"\'=A1+"",foo"""');
  });
  it("serializes objects to JSON (then quotes/escapes that)", () => {
    expect(csvSafeCell({ a: 1, b: "x" })).toBe('"{""a"":1,""b"":""x""}"');
  });
});

describe("parseCsv — RFC-4180-ish parser", () => {
  it("returns no rows for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
  it("parses a single row", () => {
    expect(parseCsv("a,b,c")).toEqual([["a", "b", "c"]]);
  });
  it("normalizes CRLF and CR line endings to LF", () => {
    expect(parseCsv("a,b\r\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(parseCsv("a,b\rc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
  it("respects quoted cells that contain commas", () => {
    expect(parseCsv('"hello, world",ok')).toEqual([["hello, world", "ok"]]);
  });
  it("respects quoted cells that contain newlines", () => {
    expect(parseCsv('"a\nb",c')).toEqual([["a\nb", "c"]]);
  });
  it("decodes escaped double quotes inside quoted cells", () => {
    expect(parseCsv('"say ""hi""",ok')).toEqual([['say "hi"', "ok"]]);
  });
  it("filters rows that are all blank cells", () => {
    expect(parseCsv("a,b\n,,\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
  it("preserves the final row when there's no trailing newline at EOF", () => {
    // Distinct from the single-row case: the final "c,d" must still emit a
    // row even though no \n separator appears after it.
    expect(parseCsv("a,b\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("csvToDeviceRows", () => {
  it("rejects fewer than 2 rows", () => {
    const result = csvToDeviceRows([["name", "deviceType"]]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/header row \+ at least one/i);
  });
  it("rejects when required name + deviceType columns are missing", () => {
    const result = csvToDeviceRows([
      ["foo", "bar"],
      ["1", "2"],
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/missing required columns/i);
  });
  it("maps canonical headers", () => {
    const result = csvToDeviceRows([
      ["name", "deviceType"],
      ["sw-01", "switch"],
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0].name).toBe("sw-01");
      expect(result.data[0].deviceType).toBe("switch");
      expect(result.data[0].sizeU).toBe(1);
      expect(result.data[0].portCount).toBe(0);
    }
  });
  it("recognizes header aliases (vendor → manufacturer, type → deviceType)", () => {
    const result = csvToDeviceRows([
      ["Name", "Type", "Vendor"],
      ["sw-01", "switch", "Cisco"],
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0].deviceType).toBe("switch");
      expect(result.data[0].manufacturer).toBe("cisco");
    }
  });
  it("recognizes 'host' as a hostname alias", () => {
    const result = csvToDeviceRows([
      ["name", "deviceType", "host"],
      ["sw-01", "switch", "sw01.lan"],
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data[0].hostname).toBe("sw01.lan");
  });
  it("returns null for empty optional cells", () => {
    const result = csvToDeviceRows([
      ["name", "deviceType", "ip"],
      ["sw-01", "switch", ""],
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data[0].ipAddress).toBeNull();
  });
  it("falls back to default for unparseable integer cells", () => {
    const result = csvToDeviceRows([
      ["name", "deviceType", "sizeU"],
      ["sw-01", "switch", "abc"],
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data[0].sizeU).toBe(1);
  });
  it("lower-cases deviceType and manufacturer for catalog matching", () => {
    const result = csvToDeviceRows([
      ["name", "deviceType", "manufacturer"],
      ["sw-01", "SWITCH", "CISCO"],
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0].deviceType).toBe("switch");
      expect(result.data[0].manufacturer).toBe("cisco");
    }
  });
  it("substitutes 'other' when deviceType is empty", () => {
    const result = csvToDeviceRows([
      ["name", "deviceType"],
      ["sw-01", ""],
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data[0].deviceType).toBe("other");
  });
  it("trims whitespace from all string cells", () => {
    const result = csvToDeviceRows([
      ["name", "deviceType"],
      ["  sw-01  ", "  switch  "],
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0].name).toBe("sw-01");
      expect(result.data[0].deviceType).toBe("switch");
    }
  });
});
