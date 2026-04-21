import { spawn } from "child_process";

/**
 * Minimal nmap wrapper — runs nmap binary via child_process, parses grepable
 * output. No external deps.
 *
 * Security notes:
 * - Never shell-interpolate the subnet arg; spawn uses argv array which is safe
 * - CIDR validation is the caller's job (use validateCidr below)
 * - Ping scan (-sn) does not require root. OS detection (-O) + SYN scan (-sS) do.
 *   V1 only uses -sn + optional -PE (ICMP) to keep things simple.
 */

export type DiscoveredHost = {
  ip: string;
  hostname: string | null;
  mac: string | null;
  vendor: string | null;
  osGuess: string | null;
  openPorts: number[];
  status: "up" | "down";
};

export type NmapScanResult = {
  hosts: DiscoveredHost[];
  durationSec: number;
  rawOutput: string; // For debugging / displaying in scan history
};

// Override with RACKSMITH_NMAP_BIN if the binary lives outside $PATH or under
// a custom path (e.g. /opt/homebrew/bin/nmap on Apple Silicon). Default
// resolves through $PATH, which works on every Linux distro and Intel macOS
// Homebrew install.
const NMAP_BIN = process.env.RACKSMITH_NMAP_BIN ?? "nmap";

/**
 * Validate a CIDR string (IPv4 only for v1). Returns sanitized form or null.
 * Prevents command-injection since spawn's argv array already prevents that,
 * but this is defense-in-depth — ensures we only feed nmap valid input.
 */
export function validateCidr(input: string): string | null {
  const trimmed = input.trim();
  // Match IPv4/CIDR: e.g. "192.168.1.0/24" or single IP "192.168.1.1"
  const re = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/;
  const match = trimmed.match(re);
  if (!match) return null;

  const [, a, b, c, d, maskStr] = match;
  const octets = [a, b, c, d].map((n) => parseInt(n, 10));
  if (octets.some((n) => isNaN(n) || n < 0 || n > 255)) return null;

  if (maskStr !== undefined) {
    const mask = parseInt(maskStr, 10);
    if (isNaN(mask) || mask < 0 || mask > 32) return null;
  }

  return trimmed;
}

export async function isNmapAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(NMAP_BIN, ["--version"], { stdio: "ignore" });
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}

/**
 * Run a ping-scan discovery against a subnet. Fire-and-forget: returns
 * `void` synchronously, and delivers the result (or an error) exclusively
 * via `onComplete`. Callers must not `await` the return value — it is not
 * a Promise.
 *
 * Keep this out of the request path: invoke from a route handler and let
 * the callback persist to the DB off the response lifecycle.
 */
export function runPingScan(
  subnet: string,
  onComplete: (result: NmapScanResult | { error: string }) => void,
  signal?: AbortSignal,
): void {
  const validated = validateCidr(subnet);
  if (!validated) {
    onComplete({ error: `Invalid CIDR: ${subnet}` });
    return;
  }

  const startedAt = Date.now();
  // -sn: no port scan (discovery only)
  // -oG -: grepable output to stdout
  // -n: no DNS resolution (faster; we'll resolve hostnames from nmap's reply field)
  // --host-timeout 10s: per-host cap so scans don't hang
  const args = ["-sn", "-oG", "-", "--host-timeout", "10s", validated];

  const proc = spawn(NMAP_BIN, args);
  let stdout = "";
  let stderr = "";

  if (signal) {
    signal.addEventListener("abort", () => proc.kill("SIGTERM"));
  }

  proc.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  proc.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  proc.on("error", (err) => {
    onComplete({
      error: err.message.includes("ENOENT")
        ? "nmap binary not found. Install nmap on the server to enable discovery."
        : `nmap failed to start: ${err.message}`,
    });
  });

  proc.on("close", (code) => {
    if (code !== 0 && code !== null) {
      onComplete({
        error: `nmap exited with code ${code}. ${stderr.trim() || ""}`.trim(),
      });
      return;
    }
    const hosts = parseGrepableOutput(stdout);
    const durationSec = Math.round((Date.now() - startedAt) / 1000);
    onComplete({ hosts, durationSec, rawOutput: stdout });
  });
}

/**
 * Parse nmap -oG grepable output.
 *
 * Example lines:
 *   # Nmap 7.92 scan initiated ...
 *   Host: 192.168.1.1 (router.local) Status: Up
 *   Host: 192.168.1.1 () Status: Up
 *   Host: 192.168.1.5 (printer)	Ports: 22/open/tcp/ssh
 */
export function parseGrepableOutput(text: string): DiscoveredHost[] {
  const hosts: DiscoveredHost[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    if (!line.startsWith("Host:")) continue;

    // "Host: <ip> (<hostname>)\tStatus: Up" OR "Host: <ip> (<hostname>)\tPorts: ..."
    const headerMatch = line.match(/^Host:\s+(\S+)\s+\(([^)]*)\)/);
    if (!headerMatch) continue;

    const [, ip, hostnameRaw] = headerMatch;
    const hostname = hostnameRaw.trim() || null;

    const statusMatch = line.match(/Status:\s+(\w+)/);
    const portsMatch = line.match(/Ports:\s+(.+?)(?:\t|$)/);

    const status: "up" | "down" =
      statusMatch && statusMatch[1].toLowerCase() === "up" ? "up" : "down";

    const openPorts: number[] = [];
    if (portsMatch) {
      // "22/open/tcp/ssh, 80/open/tcp/http"
      const portEntries = portsMatch[1].split(",");
      for (const entry of portEntries) {
        const portMatch = entry.trim().match(/^(\d+)\/open\//);
        if (portMatch) openPorts.push(parseInt(portMatch[1], 10));
      }
    }

    // nmap -sn with sudo reports MAC as a separate line like:
    // "Host: 192.168.1.1 (router.local) Status: Up"
    // "Host script result: ... (MAC: aa:bb:cc:dd:ee:ff)"
    // For v1 without sudo, MAC won't be in grepable output. That's OK.

    // Dedupe by IP — grepable output has one line per host, but port scans
    // generate a second line for the same host.
    const existing = hosts.find((h) => h.ip === ip);
    if (existing) {
      if (openPorts.length > 0) {
        existing.openPorts = [
          ...new Set([...existing.openPorts, ...openPorts]),
        ];
      }
    } else {
      hosts.push({
        ip,
        hostname,
        mac: null,
        vendor: null,
        osGuess: null,
        openPorts,
        status,
      });
    }
  }

  return hosts.filter((h) => h.status === "up");
}

/**
 * Expand a CIDR to count of host addresses it represents.
 * Used to warn about scans that would take forever.
 */
export function cidrHostCount(cidr: string): number {
  const validated = validateCidr(cidr);
  if (!validated) return 0;
  const slashIdx = validated.indexOf("/");
  if (slashIdx === -1) return 1; // single host
  const prefix = parseInt(validated.slice(slashIdx + 1), 10);
  if (isNaN(prefix)) return 0;
  return Math.pow(2, 32 - prefix);
}
