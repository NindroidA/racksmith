import type { DiscoveredHost } from "./nmap";

export type MatchResult =
  | { kind: "known"; deviceId: string; deviceName: string }
  | { kind: "new" };

type DeviceIndex = {
  id: string;
  name: string;
  ipAddress: string | null;
  macAddress: string | null;
  hostname: string | null;
};

/**
 * Match a discovered host against user's existing inventory.
 *
 * Priority: MAC exact match → IP exact match → hostname exact match.
 *
 * MAC is the strongest signal, so when the host reports a MAC we trust the
 * MAC/IP lookups and DELIBERATELY skip the hostname fallback: two L2-adjacent
 * devices commonly share a blank or duplicate PTR hostname (e.g. both resolve
 * to the router's domain suffix), which would otherwise collapse them onto
 * one inventory row. The hostname fallback only runs when no MAC was captured
 * AND the hostname is a non-empty string.
 */
export function matchHost(
  host: DiscoveredHost,
  devices: DeviceIndex[],
): MatchResult {
  if (host.mac) {
    const byMac = devices.find(
      (d) => d.macAddress?.toLowerCase() === host.mac?.toLowerCase(),
    );
    if (byMac)
      return { kind: "known", deviceId: byMac.id, deviceName: byMac.name };
  }
  const byIp = devices.find((d) => d.ipAddress === host.ip);
  if (byIp) return { kind: "known", deviceId: byIp.id, deviceName: byIp.name };

  // Hostname is the weakest match — only trust it when there's no MAC to
  // anchor on and the hostname is genuinely present (non-empty after trim).
  const hostname = host.hostname?.trim();
  if (!host.mac && hostname) {
    const byHost = devices.find(
      (d) => d.hostname?.trim().toLowerCase() === hostname.toLowerCase(),
    );
    if (byHost)
      return { kind: "known", deviceId: byHost.id, deviceName: byHost.name };
  }

  return { kind: "new" };
}

/**
 * Guess device type from hostname → vendor (OUI lookup from nmap) → open
 * ports, in that order of confidence (best-effort).
 *
 * Returns one of the `DEVICE_TYPES` strings from `src/types`. Note there is
 * no dedicated "access point" type, so Wi-Fi vendors fall under "switch"
 * (the closest network-infrastructure bucket the user can re-tag).
 */
export function guessDeviceType(host: DiscoveredHost): string {
  const name = (host.hostname || "").toLowerCase();
  const vendor = (host.vendor || "").toLowerCase();
  const ports = new Set(host.openPorts);

  // 1. Hostname heuristics (most specific — user-named or PTR record).
  if (/router|gateway|mikrotik|edgerouter|udm|\brb\d/.test(name))
    return "router";
  if (/switch|\bsw-|unifi|ubnt|ubiquiti|\bap-|accesspoint/.test(name))
    return "switch";
  if (
    /firewall|pfsense|opnsense|fortigate|fortinet|palo|sonicwall|asa/.test(name)
  )
    return "firewall";
  if (/nas|storage|synology|qnap|truenas|diskstation/.test(name))
    return "storage";
  if (/ups|powerware|apc|cyberpower|smart-?ups/.test(name)) return "ups";
  if (/pdu/.test(name)) return "pdu";
  if (/server|srv-|app-|db-|supermicro|idrac|ilo/.test(name)) return "server";

  // 2. Vendor heuristics (nmap fills `vendor` via OUI lookup for L2-adjacent
  //    hosts). Covers the common homelab/SMB gear that doesn't self-describe
  //    in its hostname.
  if (vendor) {
    if (/mikrotik|routerboard/.test(vendor)) return "router";
    if (/ubiquiti|ubnt/.test(vendor)) return "switch"; // UniFi switch/AP
    if (/cisco meraki|aruba|netgear|tp-link|zyxel|d-link/.test(vendor))
      return "switch";
    if (/fortinet|palo alto|sonicwall|watchguard|sophos/.test(vendor))
      return "firewall";
    if (/synology|qnap|netapp|drobo/.test(vendor)) return "storage";
    if (/apc|american power|cyberpower|eaton|tripp/.test(vendor)) return "ups";
    if (
      /dell|hewlett|hpe|supermicro|super micro|lenovo|intel corporate/.test(
        vendor,
      )
    )
      return "server";
  }

  // 3. Port heuristics (weakest — many hosts share these).
  if (ports.has(22) && ports.has(80) && ports.has(443) && ports.has(3306))
    return "server"; // web + DB
  if (ports.has(22) && ports.has(53)) return "router"; // DNS + SSH
  if (ports.has(80) && ports.has(443)) return "server";

  return "other";
}
