import { describe, expect, it } from "vitest";
import { synthesizeSubnetCidr } from "./materialize";

describe("synthesizeSubnetCidr", () => {
  it("slices a /24 out of an IPv4 parent network using the suffix as the third octet", () => {
    expect(synthesizeSubnetCidr("10.0.0.0", "ipv4", 5)).toBe("10.0.5.0/24");
    expect(synthesizeSubnetCidr("192.168.1.0", "ipv4", 0)).toBe(
      "192.168.0.0/24",
    );
  });

  it("always zeroes the host octet regardless of the parent's fourth octet", () => {
    expect(synthesizeSubnetCidr("172.16.0.99", "ipv4", 7)).toBe(
      "172.16.7.0/24",
    );
  });

  it("clamps the suffix into the 0-255 octet range", () => {
    expect(synthesizeSubnetCidr("10.0.0.0", "ipv4", 300)).toBe("10.0.255.0/24");
    expect(synthesizeSubnetCidr("10.0.0.0", "ipv4", -1)).toBe("10.0.0.0/24");
  });

  it("rejects IPv6 parents — slicing is not yet supported", () => {
    expect(() => synthesizeSubnetCidr("fd00::", "ipv6", 1)).toThrow(
      /IPv4 parent CIDR/,
    );
  });

  it("rejects a malformed parent network that is not four dotted octets", () => {
    expect(() => synthesizeSubnetCidr("10.0.0", "ipv4", 1)).toThrow(
      /malformed/,
    );
    expect(() => synthesizeSubnetCidr("not-an-ip", "ipv4", 1)).toThrow(
      /malformed/,
    );
  });
});
