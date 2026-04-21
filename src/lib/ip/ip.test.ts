import { describe, expect, it } from "vitest";
import {
  aggregateCidrs,
  bigIntToIp,
  calculateCidr,
  cidrsOverlap,
  ipInCidr,
  ipInRange,
  ipKindOf,
  ipToBigInt,
  ipv4ToBinary,
  ipv4NetMask,
  ipv4Wildcard,
  isValidCidr,
  isValidIp,
  normalizeCidr,
  normalizeIp,
  rangesOverlap,
  suggestNextIp,
  validateDhcpRange,
  validateIpAssignment,
  vlsmSplit,
} from "./index";

describe("parse + normalize", () => {
  it("detects valid + invalid IPs", () => {
    expect(isValidIp("192.168.1.1")).toBe(true);
    expect(isValidIp("300.1.1.1")).toBe(false);
    expect(isValidIp("2001:db8::1")).toBe(true);
    expect(isValidIp("not-an-ip")).toBe(false);
  });

  it("detects valid + invalid CIDRs", () => {
    expect(isValidCidr("192.168.1.0/24")).toBe(true);
    expect(isValidCidr("10.0.0.0/8")).toBe(true);
    expect(isValidCidr("2001:db8::/32")).toBe(true);
    expect(isValidCidr("192.168.1.0/33")).toBe(false);
    expect(isValidCidr("not/24")).toBe(false);
  });

  it("identifies ip kind", () => {
    expect(ipKindOf("10.0.0.1")).toBe("ipv4");
    expect(ipKindOf("::1")).toBe("ipv6");
    expect(ipKindOf("bad")).toBe(null);
  });

  it("normalizes IPs", () => {
    expect(normalizeIp("2001:0db8:0000::1")).toBe("2001:db8::1");
    expect(normalizeIp("192.168.001.005")).toBe("192.168.1.5");
    expect(normalizeCidr("192.168.000.000/24")).toBe("192.168.0.0/24");
  });

  it("round-trips BigInt <-> IP", () => {
    const ipv4 = "192.168.1.42";
    expect(bigIntToIp(ipToBigInt(ipv4), "ipv4")).toBe(ipv4);
    const ipv6 = "2001:db8::1";
    expect(bigIntToIp(ipToBigInt(ipv6), "ipv6")).toBe(ipv6);
  });
});

describe("calculateCidr", () => {
  it("returns expected network + broadcast for /24", () => {
    const r = calculateCidr("192.168.1.50/24");
    expect(r.network).toBe("192.168.1.0");
    expect(r.broadcast).toBe("192.168.1.255");
    expect(r.firstUsable).toBe("192.168.1.1");
    expect(r.lastUsable).toBe("192.168.1.254");
    expect(r.usableHosts).toBe(254n);
    expect(r.totalHosts).toBe(256n);
    expect(r.prefix).toBe(24);
  });

  it("/30 has 2 usable hosts", () => {
    const r = calculateCidr("10.0.0.0/30");
    expect(r.firstUsable).toBe("10.0.0.1");
    expect(r.lastUsable).toBe("10.0.0.2");
    expect(r.usableHosts).toBe(2n);
  });

  it("/31 has 0 usable hosts (RFC 3021 not modeled)", () => {
    const r = calculateCidr("10.0.0.0/31");
    expect(r.firstUsable).toBe(null);
    expect(r.lastUsable).toBe(null);
    expect(r.usableHosts).toBe(0n);
  });

  it("handles IPv6 /64", () => {
    const r = calculateCidr("2001:db8::/64");
    expect(r.kind).toBe("ipv6");
    expect(r.network).toBe("2001:db8::");
    expect(r.broadcast).toBe(null);
    expect(r.totalHosts).toBe(1n << 64n);
  });

  it("computes wildcard + netmask", () => {
    expect(ipv4NetMask(24)).toBe("255.255.255.0");
    expect(ipv4NetMask(16)).toBe("255.255.0.0");
    expect(ipv4Wildcard(24)).toBe("0.0.0.255");
  });

  it("renders binary breakdown", () => {
    expect(ipv4ToBinary("192.168.1.1")).toBe(
      "11000000.10101000.00000001.00000001",
    );
  });
});

describe("range + cidr containment", () => {
  it("ipInCidr", () => {
    expect(ipInCidr("192.168.1.50", "192.168.1.0/24")).toBe(true);
    expect(ipInCidr("192.168.2.50", "192.168.1.0/24")).toBe(false);
    expect(ipInCidr("2001:db8::1", "2001:db8::/32")).toBe(true);
    expect(ipInCidr("not-an-ip", "192.168.1.0/24")).toBe(false);
  });

  it("ipInRange", () => {
    expect(ipInRange("192.168.1.100", "192.168.1.50", "192.168.1.150")).toBe(
      true,
    );
    expect(ipInRange("192.168.1.200", "192.168.1.50", "192.168.1.150")).toBe(
      false,
    );
  });

  it("rangesOverlap", () => {
    expect(
      rangesOverlap("10.0.0.1", "10.0.0.10", "10.0.0.5", "10.0.0.20"),
    ).toBe(true);
    expect(
      rangesOverlap("10.0.0.1", "10.0.0.10", "10.0.0.20", "10.0.0.30"),
    ).toBe(false);
  });

  it("cidrsOverlap", () => {
    expect(cidrsOverlap("192.168.1.0/24", "192.168.1.128/25")).toBe(true);
    expect(cidrsOverlap("10.0.0.0/8", "10.1.1.0/24")).toBe(true);
    expect(cidrsOverlap("192.168.1.0/24", "192.168.2.0/24")).toBe(false);
    expect(cidrsOverlap("192.168.1.0/24", "2001:db8::/32")).toBe(false);
  });
});

describe("vlsm", () => {
  it("splits /24 into three subnets", () => {
    const result = vlsmSplit("192.168.1.0/24", [
      { name: "A", hosts: 100 },
      { name: "B", hosts: 50 },
      { name: "C", hosts: 20 },
    ]);
    if (!result.ok) throw new Error(result.error);
    expect(result.allocations).toHaveLength(3);
    expect(result.allocations[0].cidr).toBe("192.168.1.0/25");
    expect(result.allocations[1].cidr).toBe("192.168.1.128/26");
    expect(result.allocations[2].cidr).toBe("192.168.1.192/27");
  });

  it("fails when requirements exceed parent size", () => {
    const result = vlsmSplit("192.168.1.0/24", [{ name: "A", hosts: 500 }]);
    expect(result.ok).toBe(false);
  });

  it("fails when parent CIDR is invalid", () => {
    const result = vlsmSplit("bad", [{ name: "A", hosts: 1 }]);
    expect(result.ok).toBe(false);
  });
});

describe("aggregate", () => {
  it("merges two adjacent /25s into /24", () => {
    const out = aggregateCidrs(["192.168.1.0/25", "192.168.1.128/25"]);
    expect(out).toEqual(["192.168.1.0/24"]);
  });

  it("merges four /24s into /22", () => {
    const out = aggregateCidrs([
      "192.168.0.0/24",
      "192.168.1.0/24",
      "192.168.2.0/24",
      "192.168.3.0/24",
    ]);
    expect(out).toEqual(["192.168.0.0/22"]);
  });

  it("leaves non-adjacent CIDRs alone", () => {
    const out = aggregateCidrs(["192.168.1.0/24", "192.168.3.0/24"]);
    expect(out).toHaveLength(2);
  });
});

describe("conflict detection", () => {
  const subnet = { cidr: "192.168.1.0/24" };

  it("rejects an IP outside the subnet", () => {
    const r = validateIpAssignment(subnet, "10.0.0.1", "assigned", [], []);
    expect(r.ok).toBe(false);
  });

  it("rejects the network address", () => {
    const r = validateIpAssignment(subnet, "192.168.1.0", "assigned", [], []);
    expect(r.ok).toBe(false);
  });

  it("rejects the broadcast address", () => {
    const r = validateIpAssignment(subnet, "192.168.1.255", "assigned", [], []);
    expect(r.ok).toBe(false);
  });

  it("rejects a duplicate IP", () => {
    const r = validateIpAssignment(
      subnet,
      "192.168.1.10",
      "assigned",
      [],
      [{ ipAddress: "192.168.1.10", status: "assigned" }],
    );
    expect(r.ok).toBe(false);
  });

  it("rejects a static inside a DHCP range", () => {
    const r = validateIpAssignment(
      subnet,
      "192.168.1.120",
      "assigned",
      [{ startIp: "192.168.1.100", endIp: "192.168.1.150" }],
      [],
    );
    expect(r.ok).toBe(false);
  });

  it("accepts a valid static IP", () => {
    const r = validateIpAssignment(
      subnet,
      "192.168.1.10",
      "assigned",
      [{ startIp: "192.168.1.100", endIp: "192.168.1.150" }],
      [],
    );
    expect(r.ok).toBe(true);
  });

  it("rejects a DHCP range with an overlapping existing range", () => {
    const r = validateDhcpRange(
      subnet,
      "192.168.1.50",
      "192.168.1.100",
      [{ startIp: "192.168.1.90", endIp: "192.168.1.120" }],
      [],
    );
    expect(r.ok).toBe(false);
  });

  it("rejects a DHCP range that swallows a static assignment", () => {
    const r = validateDhcpRange(
      subnet,
      "192.168.1.50",
      "192.168.1.100",
      [],
      [{ ipAddress: "192.168.1.80", status: "assigned" }],
    );
    expect(r.ok).toBe(false);
  });
});

describe("suggestNextIp", () => {
  const subnet = { cidr: "192.168.1.0/24", gateway: "192.168.1.1" };

  it("returns the first free IP after the gateway", () => {
    const ip = suggestNextIp(subnet, [], []);
    expect(ip).toBe("192.168.1.2");
  });

  it("skips assigned IPs", () => {
    const ip = suggestNextIp(
      subnet,
      [{ ipAddress: "192.168.1.2" }, { ipAddress: "192.168.1.3" }],
      [],
    );
    expect(ip).toBe("192.168.1.4");
  });

  it("skips IPs inside a DHCP range", () => {
    const ip = suggestNextIp(
      subnet,
      [],
      [{ startIp: "192.168.1.2", endIp: "192.168.1.10" }],
    );
    expect(ip).toBe("192.168.1.11");
  });

  it("returns null when subnet is exhausted", () => {
    const taken = Array.from({ length: 253 }, (_, i) => ({
      ipAddress: `192.168.1.${i + 2}`,
    }));
    const ip = suggestNextIp(subnet, taken, []);
    expect(ip).toBe(null);
  });

  it("skips the all-zero IPv6 anycast and returns ::1 for an empty /64", () => {
    const ip = suggestNextIp({ cidr: "2001:db8::/64" }, [], []);
    expect(ip).toBe("2001:db8::1");
  });
});
