import { spawn } from "child_process";

/**
 * Minimal nmap wrapper — runs nmap binary via child_process, parses XML
 * output (`-oX -`). No external deps.
 *
 * Why XML over grepable (`-oG`): grepable output OMITS the MAC + vendor line,
 * so discovered hosts came back with empty MAC/vendor (3 of 5 device fields).
 * nmap XML <host> blocks carry the MAC as
 * `<address addr="AA:BB:.." addrtype="mac" vendor="Ubiquiti Inc"/>` — nmap
 * does the OUI vendor lookup for us. nmap XML is simple + stable enough to
 * parse with regex over <host>...</host> blocks (no XML-parser dependency).
 *
 * Security notes:
 * - Never shell-interpolate the subnet arg; spawn uses argv array which is safe
 * - CIDR validation is the caller's job (use validateCidr below)
 * - Ping scan (-sn) does not require root. OS detection (-O) + SYN scan (-sS) do.
 *   V1 only uses -sn (fast ARP/ping discovery — returns MAC+vendor for
 *   L2-adjacent hosts) to keep things simple.
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

/**
 * Tagged outcome of a ping scan. The discriminator is `kind` rather than
 * structural ("error" in result) so callers do `result.kind === "error"`
 * — easier to grep, and the success branch can grow fields without
 * risking false-positive structural matches.
 */
export type NmapScanOutcome =
  | {
      kind: "ok";
      hosts: DiscoveredHost[];
      durationSec: number;
      rawOutput: string; // For debugging / displaying in scan history
    }
  | { kind: "error"; error: string };

// Override with RACKSMITH_NMAP_BIN if the binary lives outside $PATH or under
// a custom path (e.g. /opt/homebrew/bin/nmap on Apple Silicon). Default
// resolves through $PATH, which works on every Linux distro and Intel macOS
// Homebrew install. Read at call-time so test env mutations and runtime
// reconfiguration take effect without reimport (matches `tiers.ts`).
function getNmapBin(): string {
  return process.env.RACKSMITH_NMAP_BIN ?? "nmap";
}

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
    const proc = spawn(getNmapBin(), ["--version"], { stdio: "ignore" });
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
  onComplete: (outcome: NmapScanOutcome) => void,
  signal?: AbortSignal,
): void {
  // Spawn errors can fire both `error` and `close` (with non-zero code) for
  // the same failure — the `finished` flag guarantees `onComplete` runs at
  // most once so callers don't see duplicate scan-completion writes.
  let finished = false;
  const fire = (outcome: NmapScanOutcome) => {
    if (finished) return;
    finished = true;
    onComplete(outcome);
  };

  const validated = validateCidr(subnet);
  if (!validated) {
    fire({ kind: "error", error: `Invalid CIDR: ${subnet}` });
    return;
  }

  const startedAt = Date.now();
  // -sn: no port scan (discovery only — fast ARP/ping, no root needed)
  // -oX -: XML output to stdout (carries MAC + vendor; grepable -oG does not)
  // --host-timeout 10s: per-host cap so scans don't hang
  const args = ["-sn", "-oX", "-", "--host-timeout", "10s", validated];

  const proc = spawn(getNmapBin(), args);
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
    fire({
      kind: "error",
      error: err.message.includes("ENOENT")
        ? "nmap binary not found. Install nmap on the server to enable discovery."
        : `nmap failed to start: ${err.message}`,
    });
  });

  proc.on("close", (code) => {
    if (code !== 0 && code !== null) {
      fire({
        kind: "error",
        error: `nmap exited with code ${code}. ${stderr.trim() || ""}`.trim(),
      });
      return;
    }
    const hosts = parseXmlOutput(stdout);
    const durationSec = Math.round((Date.now() - startedAt) / 1000);
    fire({ kind: "ok", hosts, durationSec, rawOutput: stdout });
  });
}

/** Decode the XML entities nmap escapes in attribute values. */
function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Parse every `name="value"` pair out of a single XML tag string into a
 * lookup map. Uses one hardcoded regex (no dynamic `RegExp(...)` built from a
 * variable — that pattern risks ReDoS and trips the security linter).
 */
function tagAttrs(tag: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const attrRe = /([\w:-]+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(tag)) !== null) {
    attrs.set(m[1], decodeXmlEntities(m[2]));
  }
  return attrs;
}

/**
 * Parse nmap XML output (`-oX -`). Regex over <host>...</host> blocks —
 * nmap XML is simple and stable, so no XML-parser dependency is warranted.
 *
 * A representative <host> block from `nmap -sn -oX -`:
 *   <host>
 *     <status state="up" reason="arp-response"/>
 *     <address addr="192.168.1.1" addrtype="ipv4"/>
 *     <address addr="AA:BB:CC:DD:EE:FF" addrtype="mac" vendor="Ubiquiti Inc"/>
 *     <hostnames><hostname name="router.local" type="PTR"/></hostnames>
 *   </host>
 *
 * MAC + vendor are only present for L2-adjacent hosts (same broadcast
 * domain). `<ports>` is only present if a port scan ran (-sn does not scan
 * ports), so openPorts is usually empty — we still parse it for the case a
 * future caller adds a port-scan path.
 */
export function parseXmlOutput(text: string): DiscoveredHost[] {
  const hosts: DiscoveredHost[] = [];
  const hostBlockRe = /<host\b[\s\S]*?<\/host>/g;

  let block: RegExpExecArray | null;
  while ((block = hostBlockRe.exec(text)) !== null) {
    const xml = block[0];

    const statusTag = xml.match(/<status\b[^>]*>/);
    const status: "up" | "down" =
      statusTag && tagAttrs(statusTag[0]).get("state")?.toLowerCase() === "up"
        ? "up"
        : "down";

    // Walk every <address> tag: ipv4 → ip, mac → mac + vendor.
    let ip: string | null = null;
    let mac: string | null = null;
    let vendor: string | null = null;
    const addrRe = /<address\b[^>]*>/g;
    let addr: RegExpExecArray | null;
    while ((addr = addrRe.exec(xml)) !== null) {
      const a = tagAttrs(addr[0]);
      const type = a.get("addrtype");
      if (type === "ipv4") {
        ip = a.get("addr") ?? null;
      } else if (type === "mac") {
        mac = a.get("addr") ?? null;
        const v = a.get("vendor");
        vendor = v && v.trim() ? v.trim() : null;
      }
    }

    // No usable IP → skip (e.g. a malformed/IPv6-only block).
    if (!ip) continue;

    // First hostname wins (nmap lists PTR/user records; the PTR is first).
    const hostnameTag = xml.match(/<hostname\b[^>]*>/);
    const hostnameRaw = hostnameTag
      ? (tagAttrs(hostnameTag[0]).get("name") ?? null)
      : null;
    const hostname = hostnameRaw && hostnameRaw.trim() ? hostnameRaw : null;

    // <ports> only present if a port scan ran. Collect open TCP/UDP ports.
    const openPorts: number[] = [];
    const portRe = /<port\b[^>]*>[\s\S]*?<\/port>|<port\b[^>]*\/>/g;
    let port: RegExpExecArray | null;
    while ((port = portRe.exec(xml)) !== null) {
      const portTag = port[0];
      const portId = tagAttrs(portTag).get("portid");
      const stateTag = portTag.match(/<state\b[^>]*>/);
      const portState = stateTag ? tagAttrs(stateTag[0]).get("state") : null;
      if (portId && portState === "open") {
        const n = parseInt(portId, 10);
        if (!Number.isNaN(n) && !openPorts.includes(n)) openPorts.push(n);
      }
    }

    hosts.push({
      ip,
      hostname,
      mac,
      vendor,
      osGuess: null,
      openPorts,
      status,
    });
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
