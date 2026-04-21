import { calculateCidr } from "./calculate";
import { ipInCidr, ipInRange, rangesOverlap } from "./range";

export type IpCheck = { ok: true } | { ok: false; error: string };

export type DhcpRangeCheck = { startIp: string; endIp: string };
export type AssignmentCheck = {
  ipAddress: string;
  status: string;
  id?: string;
};

export function validateIpAssignment(
  subnet: { cidr: string },
  ip: string,
  status: "assigned" | "reserved" | "dhcp",
  dhcpRanges: DhcpRangeCheck[],
  others: AssignmentCheck[],
): IpCheck {
  if (!ipInCidr(ip, subnet.cidr)) {
    return { ok: false, error: `IP ${ip} is not inside ${subnet.cidr}` };
  }

  const details = calculateCidr(subnet.cidr);
  if (details.kind === "ipv4") {
    if (ip === details.network) {
      return { ok: false, error: `${ip} is the network address` };
    }
    if (details.broadcast && ip === details.broadcast) {
      return { ok: false, error: `${ip} is the broadcast address` };
    }
  }

  if (others.some((o) => o.ipAddress === ip)) {
    return { ok: false, error: `${ip} is already assigned in this subnet` };
  }

  if (status === "assigned" || status === "reserved") {
    for (const r of dhcpRanges) {
      if (ipInRange(ip, r.startIp, r.endIp)) {
        return {
          ok: false,
          error: `${ip} falls inside a DHCP range (${r.startIp}–${r.endIp})`,
        };
      }
    }
  }

  return { ok: true };
}

export function validateDhcpRange(
  subnet: { cidr: string },
  startIp: string,
  endIp: string,
  existingRanges: DhcpRangeCheck[],
  assignments: AssignmentCheck[],
): IpCheck {
  if (!ipInCidr(startIp, subnet.cidr)) {
    return { ok: false, error: `Start ${startIp} outside ${subnet.cidr}` };
  }
  if (!ipInCidr(endIp, subnet.cidr)) {
    return { ok: false, error: `End ${endIp} outside ${subnet.cidr}` };
  }

  for (const r of existingRanges) {
    if (rangesOverlap(startIp, endIp, r.startIp, r.endIp)) {
      return {
        ok: false,
        error: `Overlaps existing range ${r.startIp}–${r.endIp}`,
      };
    }
  }

  const blocking = assignments.find(
    (a) =>
      (a.status === "assigned" || a.status === "reserved") &&
      ipInRange(a.ipAddress, startIp, endIp),
  );
  if (blocking) {
    return {
      ok: false,
      error: `Static assignment ${blocking.ipAddress} falls inside this range`,
    };
  }

  return { ok: true };
}
