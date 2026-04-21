import ipaddr from "ipaddr.js";
import {
  bigIntToIp,
  ipToBigInt,
  type IpKind,
  type ParsedCidr,
} from "./parse";

export function calculateCidr(input: string): ParsedCidr {
  const [addr, prefix] = ipaddr.parseCIDR(input.trim());
  const kind: IpKind = addr.kind() === "ipv4" ? "ipv4" : "ipv6";
  const totalBits = kind === "ipv4" ? 32 : 128;
  const hostBits = BigInt(totalBits - prefix);
  const totalHosts = 1n << hostBits;

  const networkBigInt =
    (ipToBigInt(addr.toNormalizedString()) >> hostBits) << hostBits;
  const network = bigIntToIp(networkBigInt, kind);

  if (kind === "ipv4") {
    const broadcastBigInt = networkBigInt + totalHosts - 1n;
    const broadcast = bigIntToIp(broadcastBigInt, "ipv4");
    const usableHosts = totalHosts > 2n ? totalHosts - 2n : 0n;
    const firstUsable =
      usableHosts > 0n ? bigIntToIp(networkBigInt + 1n, "ipv4") : null;
    const lastUsable =
      usableHosts > 0n ? bigIntToIp(broadcastBigInt - 1n, "ipv4") : null;

    return {
      kind,
      cidr: `${network}/${prefix}`,
      prefix,
      network,
      broadcast,
      firstUsable,
      lastUsable,
      totalHosts,
      usableHosts,
    };
  }

  const lastBigInt = networkBigInt + totalHosts - 1n;
  const firstUsable =
    totalHosts > 1n ? bigIntToIp(networkBigInt, "ipv6") : null;
  const lastUsable = totalHosts > 1n ? bigIntToIp(lastBigInt, "ipv6") : null;

  return {
    kind,
    cidr: `${network}/${prefix}`,
    prefix,
    network,
    broadcast: null,
    firstUsable,
    lastUsable,
    totalHosts,
    usableHosts: totalHosts,
  };
}

export function ipv4Wildcard(prefix: number): string {
  const mask = (1n << BigInt(32 - prefix)) - 1n;
  return bigIntToIp(mask, "ipv4");
}

export function ipv4NetMask(prefix: number): string {
  const host = 1n << BigInt(32 - prefix);
  const mask = 0xffffffffn ^ (host - 1n);
  return bigIntToIp(mask, "ipv4");
}

/**
 * Split an IPv4 octet into its binary form, formatted like:
 * "11000000.10101000.00000001.00000000".
 * Convenience for the subnet-calculator UI.
 */
export function ipv4ToBinary(ip: string): string {
  const n = ipToBigInt(ip);
  return [
    (n >> 24n) & 0xffn,
    (n >> 16n) & 0xffn,
    (n >> 8n) & 0xffn,
    n & 0xffn,
  ]
    .map((o) => Number(o).toString(2).padStart(8, "0"))
    .join(".");
}
