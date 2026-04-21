import { calculateCidr } from "./calculate";
import { cidrsOverlap, ipInCidr } from "./range";

export type AdvisorWarning = {
  id: string;
  severity: "warn" | "error";
  message: string;
};

const CLOUD_DEFAULTS: Array<{ name: string; cidr: string }> = [
  { name: "AWS default VPC", cidr: "172.31.0.0/16" },
  { name: "Azure default VNet", cidr: "10.0.0.0/16" },
  { name: "GCP default subnets", cidr: "10.128.0.0/9" },
];

const RFC1918_BLOCKS = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"];
const ULA_BLOCK = "fd00::/8";

export function advise(
  candidate: string,
  existing: string[],
  expectedHosts?: number,
): AdvisorWarning[] {
  const warnings: AdvisorWarning[] = [];

  let details: ReturnType<typeof calculateCidr>;
  try {
    details = calculateCidr(candidate);
  } catch {
    return [];
  }

  // 1) Overlap with existing subnets → error
  for (const other of existing) {
    if (cidrsOverlap(candidate, other)) {
      warnings.push({
        id: `overlap:${other}`,
        severity: "error",
        message: `Overlaps existing subnet ${other}.`,
      });
    }
  }

  if (details.kind === "ipv4") {
    // 2) Cloud VPC overlap
    for (const cloud of CLOUD_DEFAULTS) {
      if (cidrsOverlap(candidate, cloud.cidr)) {
        warnings.push({
          id: `cloud:${cloud.name}`,
          severity: "warn",
          message: `Overlaps ${cloud.name} default range (${cloud.cidr}). Picking a distinct block avoids surprises if you ever VPN into a cloud VPC.`,
        });
      }
    }

    // 3) Public IP space warning
    const sample = details.network;
    const isPrivate = RFC1918_BLOCKS.some((b) => ipInCidr(sample, b));
    if (!isPrivate) {
      warnings.push({
        id: "public-range",
        severity: "warn",
        message: `This range is outside RFC 1918 private space. Most homelab / LAN use cases want 10/8, 172.16/12, or 192.168/16.`,
      });
    }

    // 4) Too small for expected hosts
    if (typeof expectedHosts === "number" && expectedHosts > 0) {
      const capacity = Number(details.usableHosts);
      if (capacity < expectedHosts * 1.5) {
        warnings.push({
          id: "too-small",
          severity: "warn",
          message: `Expecting ~${expectedHosts} hosts but /${details.prefix} only has ${capacity} usable. Pick a larger block for room to grow.`,
        });
      }
    }
  }

  if (details.kind === "ipv6") {
    const isUla = ipInCidr(details.network, ULA_BLOCK);
    if (!isUla && details.prefix > 64) {
      warnings.push({
        id: "ipv6-narrow",
        severity: "warn",
        message: `/${details.prefix} is narrower than a standard /64 host subnet. Double-check this isn't a typo — IPv6 subnets are usually /64.`,
      });
    }
  }

  return warnings;
}
