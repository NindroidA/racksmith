import ipaddr from "ipaddr.js";

export type IpKind = "ipv4" | "ipv6";

export type ParsedCidr = {
  kind: IpKind;
  cidr: string;
  prefix: number;
  network: string;
  broadcast: string | null;
  firstUsable: string | null;
  lastUsable: string | null;
  totalHosts: bigint;
  usableHosts: bigint;
};

export function isValidIp(input: string): boolean {
  return ipaddr.isValid(input.trim());
}

export function isValidCidr(input: string): boolean {
  try {
    ipaddr.parseCIDR(input.trim());
    return true;
  } catch {
    return false;
  }
}

export function ipKindOf(input: string): IpKind | null {
  const trimmed = input.trim();
  if (!ipaddr.isValid(trimmed)) return null;
  const parsed = ipaddr.parse(trimmed);
  return parsed.kind() === "ipv4" ? "ipv4" : "ipv6";
}

/**
 * Normalize an IP to its RFC-5952 canonical form. Collapses runs of zero
 * groups in IPv6, strips leading zeros in IPv4. Use this when storing to the
 * DB so equality comparisons stay consistent.
 */
export function normalizeIp(input: string): string {
  return ipaddr.parse(input.trim()).toString();
}

export function normalizeCidr(input: string): string {
  const [addr, prefix] = ipaddr.parseCIDR(input.trim());
  return `${addr.toString()}/${prefix}`;
}

export function ipToBigInt(input: string): bigint {
  const parsed = ipaddr.parse(input.trim());
  const bytes = parsed.toByteArray();
  let n = 0n;
  for (const b of bytes) {
    n = (n << 8n) | BigInt(b);
  }
  return n;
}

export function bigIntToIpv4(n: bigint): string {
  const bytes = [
    Number((n >> 24n) & 0xffn),
    Number((n >> 16n) & 0xffn),
    Number((n >> 8n) & 0xffn),
    Number(n & 0xffn),
  ];
  return bytes.join(".");
}

export function bigIntToIpv6(n: bigint): string {
  const parts: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const group = Number((n >> BigInt(i * 16)) & 0xffffn);
    parts.push(group.toString(16));
  }
  return ipaddr.IPv6.parse(parts.join(":")).toString();
}

export function bigIntToIp(n: bigint, kind: IpKind): string {
  return kind === "ipv4" ? bigIntToIpv4(n) : bigIntToIpv6(n);
}
