import { describe, expect, it } from "vitest";
import { guessDeviceType, matchHost } from "./matcher";
import type { DiscoveredHost } from "./nmap";

const host = (overrides: Partial<DiscoveredHost> = {}): DiscoveredHost => ({
  ip: "10.0.0.10",
  hostname: null,
  mac: null,
  vendor: null,
  osGuess: null,
  openPorts: [],
  status: "up",
  ...overrides,
});

const device = (overrides: {
  id?: string;
  name?: string;
  ipAddress?: string | null;
  macAddress?: string | null;
  hostname?: string | null;
}) => ({
  id: overrides.id ?? "dev_1",
  name: overrides.name ?? "node",
  ipAddress: overrides.ipAddress ?? null,
  macAddress: overrides.macAddress ?? null,
  hostname: overrides.hostname ?? null,
});

describe("matcher.matchHost", () => {
  it("matches by MAC first, regardless of IP/hostname", () => {
    const result = matchHost(
      host({ ip: "10.0.0.10", mac: "AA:BB:CC:DD:EE:FF", hostname: "drift" }),
      [
        device({ id: "wrong-ip", ipAddress: "10.0.0.10" }),
        device({ id: "wrong-host", hostname: "drift" }),
        device({ id: "right", macAddress: "aa:bb:cc:dd:ee:ff" }),
      ],
    );
    expect(result).toEqual({
      kind: "known",
      deviceId: "right",
      deviceName: "node",
    });
  });

  it("falls back to IP exact match when MAC is missing", () => {
    const result = matchHost(host({ ip: "10.0.0.42" }), [
      device({ id: "right", ipAddress: "10.0.0.42" }),
    ]);
    expect(result.kind).toBe("known");
    if (result.kind === "known") expect(result.deviceId).toBe("right");
  });

  it("falls back to hostname (case-insensitive) when MAC + IP miss", () => {
    const result = matchHost(host({ hostname: "Switch-1" }), [
      device({ id: "right", hostname: "switch-1" }),
    ]);
    expect(result.kind).toBe("known");
    if (result.kind === "known") expect(result.deviceId).toBe("right");
  });

  it("returns { kind: 'new' } when no field matches", () => {
    const result = matchHost(host({ ip: "10.0.0.99", hostname: "ghost" }), [
      device({ id: "x", ipAddress: "10.0.0.1" }),
    ]);
    expect(result).toEqual({ kind: "new" });
  });

  it("returns { kind: 'new' } against an empty inventory", () => {
    expect(matchHost(host(), [])).toEqual({ kind: "new" });
  });

  it("does not false-match when host MAC is set but no inventory MAC matches and no IP/hostname matches either", () => {
    const result = matchHost(
      host({ ip: "10.0.0.50", mac: "11:22:33:44:55:66" }),
      [device({ id: "x", ipAddress: "10.0.0.1" })],
    );
    expect(result).toEqual({ kind: "new" });
  });

  it("does NOT fall back to hostname when the host reports a MAC (avoids blank/duplicate-hostname collapse)", () => {
    // Both the host and the device share the same PTR hostname, but the host
    // has a MAC that does not match the device's MAC. Trusting the hostname
    // here would wrongly collapse two distinct devices onto one row.
    const result = matchHost(
      host({
        ip: "10.0.0.51",
        mac: "AA:AA:AA:AA:AA:AA",
        hostname: "lan",
      }),
      [
        device({
          id: "other",
          macAddress: "BB:BB:BB:BB:BB:BB",
          hostname: "lan",
        }),
      ],
    );
    expect(result).toEqual({ kind: "new" });
  });

  it("does not match two MAC-less hosts that share a blank hostname", () => {
    // A device whose hostname is an empty/whitespace string must never act as
    // a hostname-match target — even for a MAC-less host with a blank name.
    const result = matchHost(host({ ip: "10.0.0.52", hostname: "   " }), [
      device({ id: "blank", hostname: "" }),
    ]);
    expect(result).toEqual({ kind: "new" });
  });

  it("still falls back to hostname when the host has NO MAC and a real hostname", () => {
    const result = matchHost(host({ hostname: "Switch-1", mac: null }), [
      device({ id: "right", hostname: "switch-1" }),
    ]);
    expect(result.kind).toBe("known");
    if (result.kind === "known") expect(result.deviceId).toBe("right");
  });
});

describe("matcher.guessDeviceType", () => {
  it.each<[string, string]>([
    ["router-edge", "router"],
    ["sw-core-1", "switch"],
    ["pfsense-fw", "firewall"],
    ["truenas01", "storage"],
    ["ups-rack-a", "ups"],
    ["pdu-1", "pdu"],
    ["app-server-3", "server"],
    ["random-thing", "other"],
  ])("hostname %j → %s", (hostname, expected) => {
    expect(guessDeviceType(host({ hostname }))).toBe(expected);
  });

  it.each<[string, string]>([
    ["Ubiquiti Inc", "switch"],
    ["MikroTikls SIA", "router"],
    ["Synology Incorporated", "storage"],
    ["QNAP Systems, Inc.", "storage"],
    ["American Power Conversion", "ups"],
    ["CyberPower Systems", "ups"],
    ["Dell Inc.", "server"],
    ["Hewlett Packard Enterprise", "server"],
    ["Super Micro Computer", "server"],
    ["Fortinet, Inc.", "firewall"],
    ["Palo Alto Networks", "firewall"],
    ["SonicWall", "firewall"],
    ["Netgear", "switch"],
    ["Some Unknown Vendor", "other"],
  ])("vendor %j → %s", (vendor, expected) => {
    expect(guessDeviceType(host({ vendor }))).toBe(expected);
  });

  it("hostname rule wins over vendor rule", () => {
    // Vendor says Ubiquiti (→ switch) but the hostname clearly names a router.
    expect(
      guessDeviceType(host({ hostname: "udm-pro", vendor: "Ubiquiti Inc" })),
    ).toBe("router");
  });

  it("vendor rule wins over port heuristic", () => {
    // Ports 80+443 alone would say "server", but the Synology OUI is stronger.
    expect(
      guessDeviceType(
        host({ vendor: "Synology Incorporated", openPorts: [80, 443] }),
      ),
    ).toBe("storage");
  });

  it("hostname vendor keywords are matched too (UniFi/Ubiquiti in the name)", () => {
    expect(guessDeviceType(host({ hostname: "unifi-ap-livingroom" }))).toBe(
      "switch",
    );
  });

  it("port heuristic 22+80+443+3306 → server", () => {
    expect(guessDeviceType(host({ openPorts: [22, 80, 443, 3306] }))).toBe(
      "server",
    );
  });

  it("port heuristic 22+53 → router (DNS + SSH)", () => {
    expect(guessDeviceType(host({ openPorts: [22, 53] }))).toBe("router");
  });

  it("port heuristic 80+443 → server (web)", () => {
    expect(guessDeviceType(host({ openPorts: [80, 443] }))).toBe("server");
  });

  it("hostname rule wins over port heuristic", () => {
    // Looks like a switch by name, but ports also match the 80+443 server
    // rule — the name takes precedence.
    expect(
      guessDeviceType(host({ hostname: "sw-edge", openPorts: [80, 443] })),
    ).toBe("switch");
  });

  it("defaults to 'other' with no signal", () => {
    expect(guessDeviceType(host())).toBe("other");
  });
});
