import ipaddr from "ipaddr.js";
import { bigIntToIp, ipToBigInt, type IpKind } from "./parse";

export type VlsmRequirement = { name: string; hosts: number };

export type VlsmAllocation = {
  name: string;
  requestedHosts: number;
  cidr: string;
  prefix: number;
  totalAddresses: bigint;
  usableHosts: bigint;
  firstIp: string;
  lastIp: string;
};

export type VlsmResult =
  | { ok: true; allocations: VlsmAllocation[]; unusedHosts: bigint }
  | { ok: false; error: string };

function smallestPrefix(
  requestedHosts: number,
  kind: IpKind,
): number {
  const totalBits = kind === "ipv4" ? 32 : 128;
  const reserved = kind === "ipv4" ? 2 : 0;
  const needed = Math.max(requestedHosts + reserved, 1);
  let prefix = totalBits;
  let size = 1n;
  while (size < BigInt(needed) && prefix > 0) {
    prefix -= 1;
    size <<= 1n;
  }
  return prefix;
}

/**
 * Split a parent CIDR into VLSM allocations that satisfy each `requirement`'s
 * host count. Greedy — largest allocation first, filling from the network
 * address upwards.
 */
export function vlsmSplit(
  parentCidr: string,
  requirements: VlsmRequirement[],
): VlsmResult {
  if (requirements.length === 0) {
    return { ok: false, error: "No subnet requirements provided" };
  }

  let parentAddr: ipaddr.IPv4 | ipaddr.IPv6;
  let parentPrefix: number;
  try {
    const [a, p] = ipaddr.parseCIDR(parentCidr.trim());
    parentAddr = a;
    parentPrefix = p;
  } catch {
    return { ok: false, error: "Invalid parent CIDR" };
  }

  const kind: IpKind = parentAddr.kind() === "ipv4" ? "ipv4" : "ipv6";
  const totalBits = kind === "ipv4" ? 32 : 128;
  const parentBase = ipToBigInt(parentAddr.toNormalizedString());
  const parentSize = 1n << BigInt(totalBits - parentPrefix);
  const parentEnd = parentBase + parentSize - 1n;

  const ordered = [...requirements].sort((a, b) => b.hosts - a.hosts);
  const allocations: VlsmAllocation[] = [];
  let cursor = parentBase;

  for (const req of ordered) {
    if (req.hosts < 0) {
      return { ok: false, error: `"${req.name}" hosts must be ≥ 0` };
    }
    const prefix = smallestPrefix(req.hosts, kind);
    if (prefix < parentPrefix) {
      return {
        ok: false,
        error: `"${req.name}" needs /${prefix} but parent is /${parentPrefix}`,
      };
    }

    const size = 1n << BigInt(totalBits - prefix);
    const aligned = cursor + ((size - (cursor % size)) % size);
    if (aligned + size - 1n > parentEnd) {
      return {
        ok: false,
        error: `Ran out of space when placing "${req.name}" (/${prefix}, ${size} addrs)`,
      };
    }

    const firstIp = bigIntToIp(aligned, kind);
    const lastIp = bigIntToIp(aligned + size - 1n, kind);
    const reserved = kind === "ipv4" ? 2n : 0n;
    const usableHosts = size > reserved ? size - reserved : 0n;

    allocations.push({
      name: req.name,
      requestedHosts: req.hosts,
      cidr: `${firstIp}/${prefix}`,
      prefix,
      totalAddresses: size,
      usableHosts,
      firstIp,
      lastIp,
    });

    cursor = aligned + size;
  }

  const unusedHosts = parentEnd - cursor + 1n;
  return { ok: true, allocations, unusedHosts: unusedHosts > 0n ? unusedHosts : 0n };
}
