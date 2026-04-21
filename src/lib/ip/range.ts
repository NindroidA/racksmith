import ipaddr from "ipaddr.js";
import { ipToBigInt } from "./parse";

export function ipInCidr(ip: string, cidr: string): boolean {
  try {
    const parsed = ipaddr.parse(ip.trim());
    const [addr, prefix] = ipaddr.parseCIDR(cidr.trim());
    if (parsed.kind() !== addr.kind()) return false;
    return parsed.match([addr, prefix]);
  } catch {
    return false;
  }
}

export function ipInRange(
  ip: string,
  startIp: string,
  endIp: string,
): boolean {
  try {
    const target = ipToBigInt(ip);
    const start = ipToBigInt(startIp);
    const end = ipToBigInt(endIp);
    return target >= start && target <= end;
  } catch {
    return false;
  }
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  try {
    const as = ipToBigInt(aStart);
    const ae = ipToBigInt(aEnd);
    const bs = ipToBigInt(bStart);
    const be = ipToBigInt(bEnd);
    return as <= be && bs <= ae;
  } catch {
    return false;
  }
}

export function cidrsOverlap(a: string, b: string): boolean {
  try {
    const [aAddr, aPrefix] = ipaddr.parseCIDR(a);
    const [bAddr, bPrefix] = ipaddr.parseCIDR(b);
    if (aAddr.kind() !== bAddr.kind()) return false;

    const totalBits = aAddr.kind() === "ipv4" ? 32 : 128;
    const minPrefix = Math.min(aPrefix, bPrefix);
    const hostBits = BigInt(totalBits - minPrefix);
    const mask = ((1n << BigInt(totalBits)) - 1n) ^ ((1n << hostBits) - 1n);

    const aNum = ipToBigInt(aAddr.toNormalizedString());
    const bNum = ipToBigInt(bAddr.toNormalizedString());
    return (aNum & mask) === (bNum & mask);
  } catch {
    return false;
  }
}
