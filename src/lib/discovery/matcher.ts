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
 * Priority: MAC exact match → IP exact match → hostname exact match.
 */
export function matchHost(
  host: DiscoveredHost,
  devices: DeviceIndex[]
): MatchResult {
  if (host.mac) {
    const byMac = devices.find(
      (d) => d.macAddress?.toLowerCase() === host.mac?.toLowerCase()
    );
    if (byMac) return { kind: "known", deviceId: byMac.id, deviceName: byMac.name };
  }
  const byIp = devices.find((d) => d.ipAddress === host.ip);
  if (byIp) return { kind: "known", deviceId: byIp.id, deviceName: byIp.name };

  if (host.hostname) {
    const byHost = devices.find(
      (d) => d.hostname?.toLowerCase() === host.hostname?.toLowerCase()
    );
    if (byHost)
      return { kind: "known", deviceId: byHost.id, deviceName: byHost.name };
  }

  return { kind: "new" };
}

/** Guess device type from hostname + open ports (best-effort). */
export function guessDeviceType(host: DiscoveredHost): string {
  const name = (host.hostname || "").toLowerCase();
  const ports = new Set(host.openPorts);

  if (/router|gateway|mikrotik|edgerouter|udm/.test(name)) return "router";
  if (/switch|sw-/.test(name)) return "switch";
  if (/firewall|pfsense|opnsense|fortigate|asa/.test(name)) return "firewall";
  if (/nas|storage|synology|qnap|truenas/.test(name)) return "storage";
  if (/ups|powerware/.test(name)) return "ups";
  if (/pdu/.test(name)) return "pdu";
  if (/server|srv-|app-|db-/.test(name)) return "server";

  // Port heuristics
  if (ports.has(22) && ports.has(80) && ports.has(443) && ports.has(3306))
    return "server"; // web + DB
  if (ports.has(22) && ports.has(53)) return "router"; // DNS + SSH
  if (ports.has(80) && ports.has(443)) return "server";

  return "other";
}
