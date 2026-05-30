import { describe, expect, it } from "vitest";
import {
  cidrsOverlap,
  ipInRange,
  rangesOverlap,
  validateDhcpRange,
  validateIpAssignment,
  vlsmSplit,
} from "./index";

describe("vlsmSplit edge cases", () => {
  it("rejects an empty requirements list", () => {
    const r = vlsmSplit("192.168.1.0/24", []);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.error).toBe("No subnet requirements provided");
  });

  it("rejects a negative host count", () => {
    const r = vlsmSplit("192.168.1.0/24", [{ name: "X", hosts: -1 }]);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.error).toContain("hosts must be");
  });

  it("rejects a requirement whose prefix is larger than the parent", () => {
    // 100 hosts needs a /25, but the parent is only a /28.
    const r = vlsmSplit("192.168.1.0/28", [{ name: "X", hosts: 100 }]);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.error).toBe('"X" needs /25 but parent is /28');
  });

  it("runs out of space when a later allocation no longer fits", () => {
    // Two /25-sized requirements in a /25 parent: the first fills the parent,
    // the second can no longer be placed.
    const r = vlsmSplit("192.168.1.0/25", [
      { name: "A", hosts: 100 },
      { name: "B", hosts: 100 },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.error).toContain('Ran out of space when placing "B"');
  });

  it("allocates a /31 for a zero-host requirement (IPv4)", () => {
    const r = vlsmSplit("192.168.1.0/24", [{ name: "Z", hosts: 0 }]);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.error);
    expect(r.allocations).toHaveLength(1);
    expect(r.allocations[0].prefix).toBe(31);
    expect(r.allocations[0].cidr).toBe("192.168.1.0/31");
    expect(r.allocations[0].totalAddresses).toBe(2n);
    // /31 has no usable hosts under the 2-reserved IPv4 model.
    expect(r.allocations[0].usableHosts).toBe(0n);
    expect(r.unusedHosts).toBe(254n);
  });

  it("splits an IPv6 parent (no reserved addresses)", () => {
    const r = vlsmSplit("2001:db8::/120", [{ name: "A", hosts: 100 }]);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.error);
    expect(r.allocations).toHaveLength(1);
    expect(r.allocations[0].prefix).toBe(121);
    expect(r.allocations[0].cidr).toBe("2001:db8::/121");
    expect(r.allocations[0].totalAddresses).toBe(128n);
    // IPv6 reserves nothing, so usable == total.
    expect(r.allocations[0].usableHosts).toBe(128n);
    expect(r.allocations[0].firstIp).toBe("2001:db8::");
    expect(r.allocations[0].lastIp).toBe("2001:db8::7f");
  });
});

describe("validateDhcpRange boundary checks", () => {
  const subnet = { cidr: "192.168.1.0/24" };

  it("rejects a range whose start is outside the subnet", () => {
    const r = validateDhcpRange(subnet, "10.0.0.5", "192.168.1.100", [], []);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.error).toContain("Start 10.0.0.5 outside");
  });

  it("rejects a range whose end is outside the subnet", () => {
    const r = validateDhcpRange(subnet, "192.168.1.50", "10.0.0.5", [], []);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected failure");
    expect(r.error).toContain("End 10.0.0.5 outside");
  });

  it("accepts a clean range with no conflicts (happy path)", () => {
    const r = validateDhcpRange(
      subnet,
      "192.168.1.50",
      "192.168.1.100",
      [{ startIp: "192.168.1.200", endIp: "192.168.1.220" }],
      [
        { ipAddress: "192.168.1.10", status: "assigned" },
        // A non-blocking status (e.g. dhcp) inside the range must not block.
        { ipAddress: "192.168.1.60", status: "dhcp" },
      ],
    );
    expect(r.ok).toBe(true);
  });
});

describe("validateIpAssignment dhcp-status carve-out", () => {
  const subnet = { cidr: "192.168.1.0/24" };

  it("allows a dhcp-status IP to sit inside a DHCP range", () => {
    // status "dhcp" skips the dhcp-range overlap guard entirely.
    const r = validateIpAssignment(
      subnet,
      "192.168.1.120",
      "dhcp",
      [{ startIp: "192.168.1.100", endIp: "192.168.1.150" }],
      [],
    );
    expect(r.ok).toBe(true);
  });
});

describe("range helpers reject invalid input", () => {
  it("ipInRange returns false on an unparseable target", () => {
    expect(ipInRange("not-an-ip", "10.0.0.1", "10.0.0.5")).toBe(false);
  });

  it("ipInRange returns false on unparseable bounds", () => {
    expect(ipInRange("10.0.0.2", "bad-start", "10.0.0.5")).toBe(false);
  });

  it("rangesOverlap returns false on unparseable bounds", () => {
    expect(rangesOverlap("nope", "x", "y", "z")).toBe(false);
  });

  it("rangesOverlap treats touching endpoints as overlapping", () => {
    // aEnd === bStart: as <= be && bs <= ae holds -> overlap.
    expect(
      rangesOverlap("10.0.0.1", "10.0.0.10", "10.0.0.10", "10.0.0.20"),
    ).toBe(true);
  });

  it("cidrsOverlap returns false on an unparseable CIDR", () => {
    expect(cidrsOverlap("nope", "also-bad")).toBe(false);
  });

  it("cidrsOverlap reports adjacent /25s as non-overlapping", () => {
    expect(cidrsOverlap("192.168.1.0/25", "192.168.1.128/25")).toBe(false);
  });
});
