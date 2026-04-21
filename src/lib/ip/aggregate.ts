import ipaddr from "ipaddr.js";
import { bigIntToIp, ipToBigInt, type IpKind } from "./parse";

type ParsedEntry = {
  kind: IpKind;
  base: bigint;
  prefix: number;
  cidr: string;
};

function parseEntry(cidr: string): ParsedEntry | null {
  try {
    const [addr, prefix] = ipaddr.parseCIDR(cidr.trim());
    const kind: IpKind = addr.kind() === "ipv4" ? "ipv4" : "ipv6";
    const totalBits = kind === "ipv4" ? 32 : 128;
    const raw = ipToBigInt(addr.toNormalizedString());
    const mask =
      ((1n << BigInt(totalBits)) - 1n) ^
      ((1n << BigInt(totalBits - prefix)) - 1n);
    const base = raw & mask;
    return { kind, base, prefix, cidr: `${bigIntToIp(base, kind)}/${prefix}` };
  } catch {
    return null;
  }
}

/**
 * Merge a list of CIDRs into the fewest possible prefixes. Only merges
 * siblings — two `/N` blocks that share a common `/N-1` parent. Non-adjacent
 * blocks are left alone.
 */
export function aggregateCidrs(cidrs: string[]): string[] {
  const entries = cidrs
    .map(parseEntry)
    .filter((e): e is ParsedEntry => e !== null)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "ipv4" ? -1 : 1;
      if (a.prefix !== b.prefix) return a.prefix - b.prefix;
      return a.base < b.base ? -1 : a.base > b.base ? 1 : 0;
    });

  let changed = true;
  let current = entries;

  while (changed) {
    changed = false;
    const merged: ParsedEntry[] = [];
    let i = 0;
    while (i < current.length) {
      const a = current[i];
      const b = current[i + 1];
      if (
        b &&
        a.kind === b.kind &&
        a.prefix === b.prefix &&
        a.prefix > 0
      ) {
        const totalBits = a.kind === "ipv4" ? 32 : 128;
        const size = 1n << BigInt(totalBits - a.prefix);
        if (b.base === a.base + size && a.base % (size * 2n) === 0n) {
          const parentPrefix = a.prefix - 1;
          merged.push({
            kind: a.kind,
            base: a.base,
            prefix: parentPrefix,
            cidr: `${bigIntToIp(a.base, a.kind)}/${parentPrefix}`,
          });
          i += 2;
          changed = true;
          continue;
        }
      }
      merged.push(a);
      i += 1;
    }
    current = merged;
  }

  return current.map((e) => e.cidr);
}
