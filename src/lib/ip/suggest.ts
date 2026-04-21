import { calculateCidr } from "./calculate";
import { bigIntToIp, ipToBigInt } from "./parse";

const MAX_ITERATIONS = 65_536;

export function suggestNextIp(
  subnet: { cidr: string; gateway?: string | null },
  assignments: Array<{ ipAddress: string }>,
  dhcpRanges: Array<{ startIp: string; endIp: string }>,
  options?: { reserveCount?: number },
): string | null {
  const details = calculateCidr(subnet.cidr);

  if (details.kind === "ipv4" && details.prefix > 30) return null;
  if (details.kind === "ipv6" && details.prefix > 124) return null;

  const taken = new Set(assignments.map((a) => a.ipAddress));
  if (subnet.gateway) taken.add(subnet.gateway);

  const dhcpBounds = dhcpRanges.map((r) => ({
    start: ipToBigInt(r.startIp),
    end: ipToBigInt(r.endIp),
  }));

  const reserveCount = options?.reserveCount ?? 0;
  const networkBig = ipToBigInt(details.network);
  const totalAddrs = details.totalHosts;
  // IPv6: skip the all-zero anycast (RFC 4291 § 2.6.1).
  const start = networkBig + 1n + BigInt(reserveCount);
  const end =
    details.kind === "ipv4"
      ? networkBig + totalAddrs - 2n
      : networkBig + totalAddrs - 1n;

  const ceiling = start + BigInt(MAX_ITERATIONS);
  for (let n = start; n <= end && n <= ceiling; n++) {
    const inDhcp = dhcpBounds.some((b) => n >= b.start && n <= b.end);
    if (inDhcp) continue;
    const ip = bigIntToIp(n, details.kind);
    if (taken.has(ip)) continue;
    return ip;
  }

  return null;
}
