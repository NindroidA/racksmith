import { describe, expect, it } from "vitest";
import { cidrHostCount, parseGrepableOutput, validateCidr } from "./nmap";

describe("discovery/nmap.validateCidr", () => {
  it.each([
    "192.168.1.0/24",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.1.1", // single host (no mask)
    "0.0.0.0/0",
    "255.255.255.255/32",
  ])("accepts %s", (input) => {
    expect(validateCidr(input)).toBe(input.trim());
  });

  it("trims whitespace", () => {
    expect(validateCidr("  192.168.1.0/24  ")).toBe("192.168.1.0/24");
  });

  it.each([
    "",
    "not-an-ip",
    "192.168.1.0/33", // mask out of range
    "192.168.1.0/-1",
    "192.168.1.256/24", // octet out of range
    "192.168.1", // missing octet
    "192.168.1.0/24/", // trailing slash
    "192.168.1.0/24 trailing",
    "::1/64", // IPv6 — out of scope for v1
    "192.168.1.0/abc",
  ])("rejects %j", (input) => {
    expect(validateCidr(input)).toBeNull();
  });
});

describe("discovery/nmap.cidrHostCount", () => {
  it.each<[string, number]>([
    ["192.168.1.1", 1], // single host (no mask)
    ["192.168.1.0/32", 1],
    ["192.168.1.0/31", 2],
    ["192.168.1.0/30", 4],
    ["192.168.1.0/24", 256],
    ["10.0.0.0/16", 65536],
    ["10.0.0.0/8", 16777216],
    ["0.0.0.0/0", 4294967296],
  ])("counts %s as %d", (cidr, expected) => {
    expect(cidrHostCount(cidr)).toBe(expected);
  });

  it("returns 0 for invalid CIDR", () => {
    expect(cidrHostCount("not-cidr")).toBe(0);
    expect(cidrHostCount("")).toBe(0);
  });
});

describe("discovery/nmap.parseGrepableOutput", () => {
  it("returns [] for empty input", () => {
    expect(parseGrepableOutput("")).toEqual([]);
  });

  it("ignores comment / non-Host lines", () => {
    const out = parseGrepableOutput(
      `# Nmap 7.92 scan initiated...
# random comment
something else`,
    );
    expect(out).toEqual([]);
  });

  it("parses an Up host with hostname", () => {
    const hosts = parseGrepableOutput(
      "Host: 192.168.1.1 (router.local)\tStatus: Up",
    );
    expect(hosts).toHaveLength(1);
    expect(hosts[0]).toMatchObject({
      ip: "192.168.1.1",
      hostname: "router.local",
      status: "up",
      openPorts: [],
    });
  });

  it("parses a host with no hostname (empty parens)", () => {
    const hosts = parseGrepableOutput("Host: 10.0.0.5 ()\tStatus: Up");
    expect(hosts).toHaveLength(1);
    expect(hosts[0].hostname).toBeNull();
    expect(hosts[0].ip).toBe("10.0.0.5");
  });

  it("filters out Down hosts", () => {
    const hosts = parseGrepableOutput(`Host: 10.0.0.1 ()\tStatus: Up
Host: 10.0.0.2 ()\tStatus: Down`);
    expect(hosts.map((h) => h.ip)).toEqual(["10.0.0.1"]);
  });

  it("extracts open ports from a Ports: line", () => {
    // nmap -oG emits Status: Up and Ports: on separate lines for the same
    // IP. Without the Status line the host is treated as "down" and
    // filtered out.
    const hosts = parseGrepableOutput(`Host: 10.0.0.5 (printer)\tStatus: Up
Host: 10.0.0.5 (printer)\tPorts: 22/open/tcp/ssh, 80/open/tcp/http, 443/closed/tcp/https`);
    expect(hosts[0].openPorts).toEqual([22, 80]);
  });

  it("merges port-scan continuation lines for the same IP", () => {
    const hosts = parseGrepableOutput(`Host: 10.0.0.5 (printer)\tStatus: Up
Host: 10.0.0.5 (printer)\tPorts: 22/open/tcp/ssh, 9100/open/tcp/jetdirect`);
    expect(hosts).toHaveLength(1);
    expect(hosts[0].openPorts.sort()).toEqual([22, 9100]);
  });

  it("dedupes overlapping port entries", () => {
    const hosts = parseGrepableOutput(`Host: 10.0.0.5 ()\tStatus: Up
Host: 10.0.0.5 ()\tPorts: 22/open/tcp/ssh
Host: 10.0.0.5 ()\tPorts: 22/open/tcp/ssh, 80/open/tcp/http`);
    expect(hosts[0].openPorts.sort()).toEqual([22, 80]);
  });
});
