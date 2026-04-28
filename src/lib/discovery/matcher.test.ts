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
