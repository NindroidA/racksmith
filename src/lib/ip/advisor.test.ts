import { describe, expect, it } from "vitest";
import { advise, type AdvisorWarning } from "./advisor";

function ids(warnings: AdvisorWarning[]): string[] {
  return warnings.map((w) => w.id);
}

function find(warnings: AdvisorWarning[], id: string): AdvisorWarning {
  const match = warnings.find((w) => w.id === id);
  if (!match) {
    throw new Error(`expected a warning with id "${id}", got: ${ids(warnings).join(", ") || "(none)"}`);
  }
  return match;
}

describe("advise", () => {
  it("returns no warnings for a clean RFC 1918 /24 outside cloud defaults", () => {
    // 192.168.1.0/24: private, no cloud overlap, no expectedHosts → clean.
    const warnings = advise("192.168.1.0/24", []);
    expect(warnings).toEqual([]);
  });

  it("returns an empty array for an unparseable candidate (catch path)", () => {
    expect(advise("not-a-cidr", ["192.168.1.0/24"])).toEqual([]);
    expect(advise("192.168.1.0/33", [])).toEqual([]);
    expect(advise("", [])).toEqual([]);
  });

  it("flags overlap with an existing subnet as a blocking error", () => {
    const warnings = advise("192.168.1.0/24", ["192.168.1.128/25"]);
    const overlap = find(warnings, "overlap:192.168.1.128/25");
    expect(overlap.severity).toBe("error");
    expect(overlap.message).toContain("192.168.1.128/25");
  });

  it("emits one overlap error per overlapping existing subnet", () => {
    const warnings = advise("10.0.0.0/8", ["10.1.0.0/16", "10.2.0.0/16"]);
    const overlaps = warnings.filter((w) => w.id.startsWith("overlap:"));
    expect(overlaps).toHaveLength(2);
    expect(overlaps.every((w) => w.severity === "error")).toBe(true);
    expect(ids(warnings)).toEqual(
      expect.arrayContaining(["overlap:10.1.0.0/16", "overlap:10.2.0.0/16"]),
    );
  });

  it("does not flag overlap for a non-overlapping existing subnet", () => {
    const warnings = advise("192.168.1.0/24", ["192.168.2.0/24"]);
    expect(ids(warnings)).not.toContain("overlap:192.168.2.0/24");
    expect(warnings).toEqual([]);
  });

  it("warns (soft) on overlap with the AWS default VPC range (172.31.0.0/16)", () => {
    const warnings = advise("172.31.0.0/24", []);
    const cloud = find(warnings, "cloud:AWS default VPC");
    expect(cloud.severity).toBe("warn");
    expect(cloud.message).toContain("172.31.0.0/16");
    expect(cloud.message).toContain("AWS default VPC");
    // 172.31/16 is inside RFC 1918 (172.16/12) — no public-range warning.
    expect(ids(warnings)).not.toContain("public-range");
  });

  it("warns (soft) on overlap with the Azure default VNet range (10.0.0.0/16)", () => {
    const warnings = advise("10.0.5.0/24", []);
    const cloud = find(warnings, "cloud:Azure default VNet");
    expect(cloud.severity).toBe("warn");
    expect(cloud.message).toContain("10.0.0.0/16");
  });

  it("warns (soft) on overlap with the GCP default subnets range (10.128.0.0/9)", () => {
    const warnings = advise("10.200.0.0/24", []);
    const cloud = find(warnings, "cloud:GCP default subnets");
    expect(cloud.severity).toBe("warn");
    expect(cloud.message).toContain("10.128.0.0/9");
  });

  it("warns (soft) on a non-RFC 1918 public IPv4 pick", () => {
    // 8.8.8.0/24 is public and overlaps no cloud default.
    const warnings = advise("8.8.8.0/24", []);
    const pub = find(warnings, "public-range");
    expect(pub.severity).toBe("warn");
    expect(pub.message).toContain("RFC 1918");
    // No cloud overlap for this block.
    expect(ids(warnings).some((id) => id.startsWith("cloud:"))).toBe(false);
  });

  it("does not emit a public-range warning for any RFC 1918 block", () => {
    expect(ids(advise("10.50.0.0/24", []))).not.toContain("public-range");
    expect(ids(advise("172.20.0.0/24", []))).not.toContain("public-range");
    expect(ids(advise("192.168.50.0/24", []))).not.toContain("public-range");
  });

  it("warns when the block is too small for expected hosts (capacity < hosts * 1.5)", () => {
    // /24 → 254 usable. expecting 200 → 200 * 1.5 = 300 > 254 → too small.
    const warnings = advise("192.168.1.0/24", [], 200);
    const small = find(warnings, "too-small");
    expect(small.severity).toBe("warn");
    expect(small.message).toContain("200");
    expect(small.message).toContain("254");
    expect(small.message).toContain("/24");
  });

  it("does not warn too-small when capacity comfortably exceeds expected hosts", () => {
    // /24 → 254 usable. expecting 100 → 100 * 1.5 = 150 < 254 → OK.
    const warnings = advise("192.168.1.0/24", [], 100);
    expect(ids(warnings)).not.toContain("too-small");
    expect(warnings).toEqual([]);
  });

  it("ignores expectedHosts when it is zero or negative", () => {
    expect(ids(advise("192.168.1.0/24", [], 0))).not.toContain("too-small");
    expect(ids(advise("192.168.1.0/24", [], -5))).not.toContain("too-small");
  });

  it("warns on an IPv6 prefix narrower than /64 (non-ULA)", () => {
    const warnings = advise("2001:db8::/80", []);
    const narrow = find(warnings, "ipv6-narrow");
    expect(narrow.severity).toBe("warn");
    expect(narrow.message).toContain("/80");
    expect(narrow.message).toContain("/64");
  });

  it("does not warn ipv6-narrow for a standard /64 or wider prefix", () => {
    expect(ids(advise("2001:db8::/64", []))).not.toContain("ipv6-narrow");
    expect(ids(advise("2001:db8::/48", []))).not.toContain("ipv6-narrow");
  });

  it("does not warn ipv6-narrow for a narrow ULA prefix (fd00::/8 carve-out)", () => {
    // ULA address with a narrow prefix → carve-out, no warning.
    expect(ids(advise("fd00::/96", []))).not.toContain("ipv6-narrow");
    expect(advise("fd12:3456::/96", [])).toEqual([]);
  });

  it("does not run IPv4-only checks against an IPv6 candidate", () => {
    const warnings = advise("2001:db8::/64", []);
    expect(ids(warnings)).not.toContain("public-range");
    expect(ids(warnings).some((id) => id.startsWith("cloud:"))).toBe(false);
    expect(ids(warnings)).not.toContain("too-small");
    expect(warnings).toEqual([]);
  });

  it("stacks multiple warnings: overlap + cloud + too-small together", () => {
    // 10.0.0.0/24 overlaps existing 10.0.0.0/24 (error), Azure 10.0/16 (cloud
    // warn), and is too small for 1000 expected hosts (warn).
    const warnings = advise("10.0.0.0/24", ["10.0.0.0/24"], 1000);
    expect(ids(warnings)).toEqual(
      expect.arrayContaining([
        "overlap:10.0.0.0/24",
        "cloud:Azure default VNet",
        "too-small",
      ]),
    );
    // Private block → no public-range warning even with everything else.
    expect(ids(warnings)).not.toContain("public-range");
    expect(find(warnings, "overlap:10.0.0.0/24").severity).toBe("error");
  });

  it("trims surrounding whitespace on the candidate before parsing", () => {
    // Leading/trailing whitespace must still parse to a clean private /24.
    expect(advise("  192.168.1.0/24  ", [])).toEqual([]);
  });
});
