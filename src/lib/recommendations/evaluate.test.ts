import { describe, expect, it } from "vitest";
import { evaluateRules } from "./evaluate";
import type { Snapshot } from "./snapshot";
import { dismissalKey } from "./types";

function makeSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    organizationId: "org1",
    capturedAt: 1000,
    racks: [],
    devices: [],
    connections: [],
    subnets: [],
    vlans: [],
    ...overrides,
  };
}

describe("evaluateRules — capacity thresholds", () => {
  it("does not warn when rack fill is below 80%", () => {
    const snap = makeSnapshot({
      racks: [{ id: "r1", name: "A", sizeU: 42, deviceFillU: 30 }],
    });
    const out = evaluateRules({ snapshot: snap, dismissals: new Set() });
    expect(out).toHaveLength(0);
  });

  it("warns when rack fill ≥ 80% but < 95%", () => {
    const snap = makeSnapshot({
      racks: [{ id: "r1", name: "A", sizeU: 10, deviceFillU: 8 }],
    });
    const out = evaluateRules({ snapshot: snap, dismissals: new Set() });
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe("warning");
    expect(out[0].ruleKey).toBe("rack:fill");
  });

  it("flags critical when rack fill ≥ 95%", () => {
    const snap = makeSnapshot({
      racks: [{ id: "r1", name: "B", sizeU: 20, deviceFillU: 19 }],
    });
    const out = evaluateRules({ snapshot: snap, dismissals: new Set() });
    expect(out[0].severity).toBe("critical");
  });

  it("counts switch ports across both ends of a connection", () => {
    const snap = makeSnapshot({
      devices: [
        {
          id: "sw1",
          name: "Sw",
          deviceType: "switch",
          sizeU: 1,
          portCount: 4,
          powerWatts: null,
          rackId: null,
        },
      ],
      connections: [
        { sourceDeviceId: "sw1", targetDeviceId: "x" },
        { sourceDeviceId: "sw1", targetDeviceId: "y" },
        { sourceDeviceId: "sw1", targetDeviceId: "z" },
        { sourceDeviceId: "sw1", targetDeviceId: "q" },
      ],
    });
    const out = evaluateRules({ snapshot: snap, dismissals: new Set() });
    const critical = out.find((r) => r.ruleKey === "switch:port_fill");
    expect(critical?.severity).toBe("critical");
  });

  it("dismissals filter recommendations by ruleKey + entityKey", () => {
    const snap = makeSnapshot({
      racks: [{ id: "r1", name: "A", sizeU: 10, deviceFillU: 9 }],
    });
    const dismissed = new Set([dismissalKey("rack:fill", "rack:r1")]);
    const out = evaluateRules({ snapshot: snap, dismissals: dismissed });
    expect(out).toHaveLength(0);
  });

  it("orders critical before warning before info", () => {
    const snap = makeSnapshot({
      racks: [{ id: "r1", name: "A", sizeU: 10, deviceFillU: 10 }], // critical
      vlans: [{ id: "v1", vlanId: 10, name: "Mgmt", assignmentCount: 0 }], // info
      devices: [
        {
          id: "d1",
          name: "X",
          deviceType: "server",
          sizeU: 1,
          portCount: 0,
          powerWatts: null,
          rackId: null,
        }, // unracked → info
      ],
    });
    const out = evaluateRules({ snapshot: snap, dismissals: new Set() });
    const severities = out.map((r) => r.severity);
    const firstWarn = severities.indexOf("warning");
    const firstInfo = severities.indexOf("info");
    expect(severities[0]).toBe("critical");
    if (firstWarn !== -1 && firstInfo !== -1) {
      expect(firstWarn).toBeLessThan(firstInfo);
    }
  });

  it("DHCP exhaustion only counts dhcp-status assignments", () => {
    const snap = makeSnapshot({
      subnets: [
        {
          id: "s1",
          cidr: "192.168.1.0/24",
          name: "Home",
          assignmentCount: 100,
          dhcpRanges: [{ startIp: "192.168.1.100", endIp: "192.168.1.110" }], // 11 addrs
          dhcpAssignmentCount: 11,
        },
      ],
    });
    const out = evaluateRules({ snapshot: snap, dismissals: new Set() });
    const dhcp = out.find((r) => r.ruleKey === "subnet:dhcp_pool");
    expect(dhcp?.severity).toBe("critical");
  });

  it("PoE budget rule sums neighbours from connections", () => {
    const snap = makeSnapshot({
      devices: [
        {
          id: "sw",
          name: "Switch",
          deviceType: "switch",
          sizeU: 1,
          portCount: 24,
          powerWatts: 100, // budget
          rackId: null,
        },
        {
          id: "ap1",
          name: "AP",
          deviceType: "other",
          sizeU: 0,
          portCount: 0,
          powerWatts: 50, // explicit per-device draw
          rackId: null,
        },
        {
          id: "ap2",
          name: "AP2",
          deviceType: "other",
          sizeU: 0,
          portCount: 0,
          powerWatts: 50,
          rackId: null,
        },
      ],
      connections: [
        { sourceDeviceId: "sw", targetDeviceId: "ap1" },
        { sourceDeviceId: "sw", targetDeviceId: "ap2" },
      ],
    });
    const out = evaluateRules({ snapshot: snap, dismissals: new Set() });
    const poe = out.find((r) => r.ruleKey === "switch:poe_budget");
    expect(poe?.severity).toBe("critical"); // 100/100 = 100% ≥ 90%
  });
});
