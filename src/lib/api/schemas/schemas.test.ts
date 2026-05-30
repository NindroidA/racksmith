import { describe, expect, it } from "vitest";
import {
  CABLE_TYPES,
  connectionResponseSchema,
  createConnectionBodySchema,
  listConnectionsQuerySchema,
  updateConnectionBodySchema,
} from "./connection";
import {
  createDhcpRangeBodySchema,
  dhcpRangeResponseSchema,
  listDhcpRangesQuerySchema,
  updateDhcpRangeBodySchema,
} from "./dhcp-range";
import {
  createIpAssignmentBodySchema,
  IP_ASSIGNMENT_STATUSES,
  ipAssignmentResponseSchema,
  listIpAssignmentsQuerySchema,
  updateIpAssignmentBodySchema,
} from "./ip-assignment";
import {
  createSubnetBodySchema,
  listSubnetsQuerySchema,
  subnetResponseSchema,
  updateSubnetBodySchema,
} from "./subnet";
import {
  createVlanBodySchema,
  listVlansQuerySchema,
  updateVlanBodySchema,
  vlanResponseSchema,
} from "./vlan";

// Two distinct valid CUIDs for the cuid()-validated fields below.
const CUID_A = "cmoc7jpxl000n6dtbamrx2lug";
const CUID_B = "cmoc7jpxl000n6dtbamrx2zzz";

describe("connection schemas", () => {
  describe("createConnectionBodySchema", () => {
    it("accepts a fully-valid body and applies defaults", () => {
      const r = createConnectionBodySchema.safeParse({
        sourceDeviceId: CUID_A,
        targetDeviceId: CUID_B,
      });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.sourcePort).toBe("");
      expect(r.data.targetPort).toBe("");
      expect(r.data.cableType).toBe("ethernet");
      expect(r.data.cableLengthFt).toBeNull();
      expect(r.data.vlan).toBeNull();
      expect(r.data.bandwidth).toBeNull();
      expect(r.data.description).toBe("");
    });

    it("accepts an explicit fully-populated body", () => {
      const r = createConnectionBodySchema.safeParse({
        sourceDeviceId: CUID_A,
        sourcePort: "Gi0/1",
        targetDeviceId: CUID_B,
        targetPort: "Gi0/2",
        cableType: "fiber",
        cableLengthFt: 10.5,
        vlan: "100",
        bandwidth: "10G",
        description: "uplink",
      });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.cableType).toBe("fiber");
      expect(r.data.cableLengthFt).toBe(10.5);
    });

    it("rejects a self-loop (source === target)", () => {
      const r = createConnectionBodySchema.safeParse({
        sourceDeviceId: CUID_A,
        targetDeviceId: CUID_A,
      });
      expect(r.success).toBe(false);
      if (r.success) return;
      expect(r.error.issues[0].path).toEqual(["targetDeviceId"]);
    });

    it("rejects missing required sourceDeviceId", () => {
      const r = createConnectionBodySchema.safeParse({
        targetDeviceId: CUID_B,
      });
      expect(r.success).toBe(false);
    });

    it("rejects a non-cuid device id", () => {
      const r = createConnectionBodySchema.safeParse({
        sourceDeviceId: "not-a-cuid",
        targetDeviceId: CUID_B,
      });
      expect(r.success).toBe(false);
    });

    it("rejects an out-of-set cableType", () => {
      const r = createConnectionBodySchema.safeParse({
        sourceDeviceId: CUID_A,
        targetDeviceId: CUID_B,
        cableType: "thunderbolt",
      });
      expect(r.success).toBe(false);
    });

    it("rejects cableLengthFt above 1000", () => {
      const r = createConnectionBodySchema.safeParse({
        sourceDeviceId: CUID_A,
        targetDeviceId: CUID_B,
        cableLengthFt: 1001,
      });
      expect(r.success).toBe(false);
    });

    it("rejects negative cableLengthFt", () => {
      const r = createConnectionBodySchema.safeParse({
        sourceDeviceId: CUID_A,
        targetDeviceId: CUID_B,
        cableLengthFt: -1,
      });
      expect(r.success).toBe(false);
    });

    it("rejects a sourcePort over the 50-char cap", () => {
      const r = createConnectionBodySchema.safeParse({
        sourceDeviceId: CUID_A,
        targetDeviceId: CUID_B,
        sourcePort: "p".repeat(51),
      });
      expect(r.success).toBe(false);
    });

    it("rejects a description over the 500-char cap", () => {
      const r = createConnectionBodySchema.safeParse({
        sourceDeviceId: CUID_A,
        targetDeviceId: CUID_B,
        description: "d".repeat(501),
      });
      expect(r.success).toBe(false);
    });

    it("rejects unknown keys (strict)", () => {
      const r = createConnectionBodySchema.safeParse({
        sourceDeviceId: CUID_A,
        targetDeviceId: CUID_B,
        organizationId: "x",
      });
      expect(r.success).toBe(false);
    });

    it("rejects a non-numeric cableLengthFt type", () => {
      const r = createConnectionBodySchema.safeParse({
        sourceDeviceId: CUID_A,
        targetDeviceId: CUID_B,
        cableLengthFt: "10",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("updateConnectionBodySchema", () => {
    it("accepts an empty partial body", () => {
      const r = updateConnectionBodySchema.safeParse({});
      expect(r.success).toBe(true);
    });

    it("accepts a single-field update", () => {
      const r = updateConnectionBodySchema.safeParse({ vlan: "200" });
      expect(r.success).toBe(true);
    });

    it("allows a one-sided endpoint change without triggering the self-loop guard", () => {
      const r = updateConnectionBodySchema.safeParse({
        sourceDeviceId: CUID_A,
      });
      expect(r.success).toBe(true);
    });

    it("rejects a self-loop when both endpoints are present and equal", () => {
      const r = updateConnectionBodySchema.safeParse({
        sourceDeviceId: CUID_A,
        targetDeviceId: CUID_A,
      });
      expect(r.success).toBe(false);
    });

    it("accepts both endpoints when they differ", () => {
      const r = updateConnectionBodySchema.safeParse({
        sourceDeviceId: CUID_A,
        targetDeviceId: CUID_B,
      });
      expect(r.success).toBe(true);
    });

    it("rejects unknown keys (strict)", () => {
      const r = updateConnectionBodySchema.safeParse({ foo: 1 });
      expect(r.success).toBe(false);
    });
  });

  describe("connectionResponseSchema", () => {
    it("parses a row and serializes createdAt to ISO", () => {
      const r = connectionResponseSchema.safeParse({
        id: "id1",
        sourceDeviceId: "d1",
        sourcePort: "Gi0/1",
        targetDeviceId: "d2",
        targetPort: "Gi0/2",
        cableType: "dac",
        cableLengthFt: null,
        vlan: null,
        bandwidth: null,
        description: "",
        createdAt: new Date("2026-01-02T03:04:05.000Z"),
      });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.createdAt).toBe("2026-01-02T03:04:05.000Z");
      expect(r.data.cableLengthFt).toBeNull();
    });

    it("rejects a non-nullable null description", () => {
      const r = connectionResponseSchema.safeParse({
        id: "id1",
        sourceDeviceId: "d1",
        sourcePort: "",
        targetDeviceId: "d2",
        targetPort: "",
        cableType: "ethernet",
        cableLengthFt: null,
        vlan: null,
        bandwidth: null,
        description: null,
        createdAt: new Date(),
      });
      expect(r.success).toBe(false);
    });
  });

  describe("listConnectionsQuerySchema", () => {
    it("coerces string limit/offset and applies defaults", () => {
      const r = listConnectionsQuerySchema.safeParse({});
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.limit).toBe(50);
      expect(r.data.offset).toBe(0);
    });

    it("coerces numeric strings", () => {
      const r = listConnectionsQuerySchema.safeParse({
        limit: "10",
        offset: "5",
      });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.limit).toBe(10);
      expect(r.data.offset).toBe(5);
    });

    it("rejects limit above 200", () => {
      const r = listConnectionsQuerySchema.safeParse({ limit: "201" });
      expect(r.success).toBe(false);
    });

    it("rejects a negative offset", () => {
      const r = listConnectionsQuerySchema.safeParse({ offset: "-1" });
      expect(r.success).toBe(false);
    });

    it("rejects an out-of-set cableType filter", () => {
      const r = listConnectionsQuerySchema.safeParse({ cableType: "nope" });
      expect(r.success).toBe(false);
    });
  });

  it("exports the canonical CABLE_TYPES set", () => {
    expect(CABLE_TYPES).toContain("ethernet");
    expect(CABLE_TYPES).toContain("other");
    expect(CABLE_TYPES).toHaveLength(6);
  });
});

describe("dhcp-range schemas", () => {
  describe("createDhcpRangeBodySchema", () => {
    it("accepts a valid body and defaults label", () => {
      const r = createDhcpRangeBodySchema.safeParse({
        subnetId: CUID_A,
        startIp: "10.0.0.10",
        endIp: "10.0.0.99",
      });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.label).toBe("");
    });

    it("rejects an empty startIp", () => {
      const r = createDhcpRangeBodySchema.safeParse({
        subnetId: CUID_A,
        startIp: "",
        endIp: "10.0.0.99",
      });
      expect(r.success).toBe(false);
    });

    it("rejects an IP string over the 45-char cap", () => {
      const r = createDhcpRangeBodySchema.safeParse({
        subnetId: CUID_A,
        startIp: "1".repeat(46),
        endIp: "10.0.0.99",
      });
      expect(r.success).toBe(false);
    });

    it("rejects missing subnetId", () => {
      const r = createDhcpRangeBodySchema.safeParse({
        startIp: "10.0.0.10",
        endIp: "10.0.0.99",
      });
      expect(r.success).toBe(false);
    });

    it("rejects a non-cuid subnetId", () => {
      const r = createDhcpRangeBodySchema.safeParse({
        subnetId: "abc",
        startIp: "10.0.0.10",
        endIp: "10.0.0.99",
      });
      expect(r.success).toBe(false);
    });

    it("rejects a label over the 100-char cap", () => {
      const r = createDhcpRangeBodySchema.safeParse({
        subnetId: CUID_A,
        startIp: "10.0.0.10",
        endIp: "10.0.0.99",
        label: "l".repeat(101),
      });
      expect(r.success).toBe(false);
    });

    it("rejects unknown keys (strict)", () => {
      const r = createDhcpRangeBodySchema.safeParse({
        subnetId: CUID_A,
        startIp: "10.0.0.10",
        endIp: "10.0.0.99",
        extra: true,
      });
      expect(r.success).toBe(false);
    });
  });

  describe("updateDhcpRangeBodySchema", () => {
    it("accepts an empty body", () => {
      expect(updateDhcpRangeBodySchema.safeParse({}).success).toBe(true);
    });

    it("accepts a single-field update", () => {
      const r = updateDhcpRangeBodySchema.safeParse({ label: "DHCP pool" });
      expect(r.success).toBe(true);
    });

    it("rejects a bad type on an optional field", () => {
      const r = updateDhcpRangeBodySchema.safeParse({ startIp: 123 });
      expect(r.success).toBe(false);
    });
  });

  describe("dhcpRangeResponseSchema", () => {
    it("parses a valid row", () => {
      const r = dhcpRangeResponseSchema.safeParse({
        id: "x",
        subnetId: "s",
        startIp: "10.0.0.10",
        endIp: "10.0.0.99",
        label: "pool",
      });
      expect(r.success).toBe(true);
    });

    it("rejects a missing label field", () => {
      const r = dhcpRangeResponseSchema.safeParse({
        id: "x",
        subnetId: "s",
        startIp: "10.0.0.10",
        endIp: "10.0.0.99",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("listDhcpRangesQuerySchema", () => {
    it("applies defaults", () => {
      const r = listDhcpRangesQuerySchema.safeParse({});
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.limit).toBe(50);
    });

    it("rejects a non-cuid subnetId filter", () => {
      const r = listDhcpRangesQuerySchema.safeParse({ subnetId: "nope" });
      expect(r.success).toBe(false);
    });
  });
});

describe("ip-assignment schemas", () => {
  describe("createIpAssignmentBodySchema", () => {
    it("accepts a valid body and applies defaults", () => {
      const r = createIpAssignmentBodySchema.safeParse({
        subnetId: CUID_A,
        ipAddress: "10.0.0.5",
      });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.deviceId).toBeNull();
      expect(r.data.status).toBe("assigned");
      expect(r.data.notes).toBe("");
    });

    it("accepts an explicit status and deviceId", () => {
      const r = createIpAssignmentBodySchema.safeParse({
        subnetId: CUID_A,
        ipAddress: "2001:db8::1",
        deviceId: CUID_B,
        status: "reserved",
        notes: "gateway",
      });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.status).toBe("reserved");
      expect(r.data.deviceId).toBe(CUID_B);
    });

    it("rejects an empty ipAddress", () => {
      const r = createIpAssignmentBodySchema.safeParse({
        subnetId: CUID_A,
        ipAddress: "",
      });
      expect(r.success).toBe(false);
    });

    it("rejects an ipAddress over the 45-char cap", () => {
      const r = createIpAssignmentBodySchema.safeParse({
        subnetId: CUID_A,
        ipAddress: "1".repeat(46),
      });
      expect(r.success).toBe(false);
    });

    it("rejects an out-of-set status", () => {
      const r = createIpAssignmentBodySchema.safeParse({
        subnetId: CUID_A,
        ipAddress: "10.0.0.5",
        status: "leased",
      });
      expect(r.success).toBe(false);
    });

    it("rejects a non-cuid deviceId", () => {
      const r = createIpAssignmentBodySchema.safeParse({
        subnetId: CUID_A,
        ipAddress: "10.0.0.5",
        deviceId: "abc",
      });
      expect(r.success).toBe(false);
    });

    it("rejects missing subnetId", () => {
      const r = createIpAssignmentBodySchema.safeParse({
        ipAddress: "10.0.0.5",
      });
      expect(r.success).toBe(false);
    });

    it("rejects notes over the 500-char cap", () => {
      const r = createIpAssignmentBodySchema.safeParse({
        subnetId: CUID_A,
        ipAddress: "10.0.0.5",
        notes: "n".repeat(501),
      });
      expect(r.success).toBe(false);
    });

    it("rejects unknown keys (strict)", () => {
      const r = createIpAssignmentBodySchema.safeParse({
        subnetId: CUID_A,
        ipAddress: "10.0.0.5",
        organizationId: "x",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("updateIpAssignmentBodySchema", () => {
    it("accepts an empty body", () => {
      expect(updateIpAssignmentBodySchema.safeParse({}).success).toBe(true);
    });

    it("accepts a status-only update", () => {
      const r = updateIpAssignmentBodySchema.safeParse({ status: "dhcp" });
      expect(r.success).toBe(true);
    });

    it("rejects a bad enum on an optional field", () => {
      const r = updateIpAssignmentBodySchema.safeParse({ status: "bogus" });
      expect(r.success).toBe(false);
    });
  });

  describe("ipAssignmentResponseSchema", () => {
    it("parses a row and serializes createdAt to ISO", () => {
      const r = ipAssignmentResponseSchema.safeParse({
        id: "x",
        subnetId: "s",
        ipAddress: "10.0.0.5",
        deviceId: null,
        status: "assigned",
        notes: "",
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
      });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.createdAt).toBe("2026-05-01T00:00:00.000Z");
      expect(r.data.deviceId).toBeNull();
    });

    it("rejects an out-of-set status in the response", () => {
      const r = ipAssignmentResponseSchema.safeParse({
        id: "x",
        subnetId: "s",
        ipAddress: "10.0.0.5",
        deviceId: null,
        status: "leased",
        notes: "",
        createdAt: new Date(),
      });
      expect(r.success).toBe(false);
    });
  });

  describe("listIpAssignmentsQuerySchema", () => {
    it("applies defaults", () => {
      const r = listIpAssignmentsQuerySchema.safeParse({});
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.offset).toBe(0);
    });

    it("accepts a valid status filter", () => {
      const r = listIpAssignmentsQuerySchema.safeParse({ status: "dhcp" });
      expect(r.success).toBe(true);
    });

    it("rejects an out-of-set status filter", () => {
      const r = listIpAssignmentsQuerySchema.safeParse({ status: "nope" });
      expect(r.success).toBe(false);
    });
  });

  it("exports the canonical IP_ASSIGNMENT_STATUSES set", () => {
    expect(IP_ASSIGNMENT_STATUSES).toEqual(["assigned", "reserved", "dhcp"]);
  });
});

describe("subnet schemas", () => {
  describe("createSubnetBodySchema", () => {
    it("accepts a valid IPv4 CIDR and applies defaults", () => {
      const r = createSubnetBodySchema.safeParse({
        cidr: "10.0.0.0/24",
        name: "LAN",
      });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.description).toBe("");
      expect(r.data.gateway).toBeNull();
      expect(r.data.dnsServers).toBeNull();
      expect(r.data.color).toBe("blue");
      expect(r.data.vlanId).toBeNull();
    });

    it("accepts an IPv6 CIDR", () => {
      const r = createSubnetBodySchema.safeParse({
        cidr: "2001:db8::/32",
        name: "v6",
      });
      expect(r.success).toBe(true);
    });

    it("rejects a CIDR with no prefix slash", () => {
      const r = createSubnetBodySchema.safeParse({
        cidr: "10.0.0.0",
        name: "LAN",
      });
      expect(r.success).toBe(false);
    });

    it("rejects an empty cidr", () => {
      const r = createSubnetBodySchema.safeParse({ cidr: "", name: "LAN" });
      expect(r.success).toBe(false);
    });

    it("rejects an empty name", () => {
      const r = createSubnetBodySchema.safeParse({
        cidr: "10.0.0.0/24",
        name: "",
      });
      expect(r.success).toBe(false);
    });

    it("rejects an out-of-set color", () => {
      const r = createSubnetBodySchema.safeParse({
        cidr: "10.0.0.0/24",
        name: "LAN",
        color: "magenta",
      });
      expect(r.success).toBe(false);
    });

    it("rejects a non-cuid vlanId", () => {
      const r = createSubnetBodySchema.safeParse({
        cidr: "10.0.0.0/24",
        name: "LAN",
        vlanId: "abc",
      });
      expect(r.success).toBe(false);
    });

    it("rejects a name over the 100-char cap", () => {
      const r = createSubnetBodySchema.safeParse({
        cidr: "10.0.0.0/24",
        name: "n".repeat(101),
      });
      expect(r.success).toBe(false);
    });

    it("rejects a cidr over the 64-char cap", () => {
      const r = createSubnetBodySchema.safeParse({
        cidr: `${"1".repeat(64)}/24`,
        name: "LAN",
      });
      expect(r.success).toBe(false);
    });

    it("rejects unknown keys (strict)", () => {
      const r = createSubnetBodySchema.safeParse({
        cidr: "10.0.0.0/24",
        name: "LAN",
        organizationId: "x",
      });
      expect(r.success).toBe(false);
    });

    it("accepts a null gateway and dnsServers explicitly", () => {
      const r = createSubnetBodySchema.safeParse({
        cidr: "10.0.0.0/24",
        name: "LAN",
        gateway: null,
        dnsServers: null,
      });
      expect(r.success).toBe(true);
    });
  });

  describe("updateSubnetBodySchema", () => {
    it("accepts an empty body", () => {
      expect(updateSubnetBodySchema.safeParse({}).success).toBe(true);
    });

    it("accepts a name-only update", () => {
      const r = updateSubnetBodySchema.safeParse({ name: "DMZ" });
      expect(r.success).toBe(true);
    });

    it("re-applies the CIDR slash rule on update", () => {
      const r = updateSubnetBodySchema.safeParse({ cidr: "10.0.0.0" });
      expect(r.success).toBe(false);
    });
  });

  describe("subnetResponseSchema", () => {
    it("parses a row and serializes createdAt to ISO", () => {
      const r = subnetResponseSchema.safeParse({
        id: "x",
        cidr: "10.0.0.0/24",
        name: "LAN",
        description: "",
        gateway: null,
        dnsServers: null,
        color: "green",
        vlanId: null,
        createdAt: new Date("2026-03-04T05:06:07.000Z"),
      });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.createdAt).toBe("2026-03-04T05:06:07.000Z");
    });

    it("rejects an out-of-set color in the response", () => {
      const r = subnetResponseSchema.safeParse({
        id: "x",
        cidr: "10.0.0.0/24",
        name: "LAN",
        description: "",
        gateway: null,
        dnsServers: null,
        color: "teal",
        vlanId: null,
        createdAt: new Date(),
      });
      expect(r.success).toBe(false);
    });
  });

  describe("listSubnetsQuerySchema", () => {
    it("applies defaults", () => {
      const r = listSubnetsQuerySchema.safeParse({});
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.limit).toBe(50);
    });

    it("rejects a non-cuid vlanId filter", () => {
      const r = listSubnetsQuerySchema.safeParse({ vlanId: "nope" });
      expect(r.success).toBe(false);
    });
  });
});

describe("vlan schemas", () => {
  describe("createVlanBodySchema", () => {
    it("accepts a valid body and applies defaults", () => {
      const r = createVlanBodySchema.safeParse({
        vlanId: 10,
        name: "Users",
      });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.description).toBe("");
      expect(r.data.color).toBe("purple");
      expect(r.data.purpose).toBe("user");
    });

    it("accepts the boundary vlanId values 1 and 4094", () => {
      expect(
        createVlanBodySchema.safeParse({ vlanId: 1, name: "min" }).success,
      ).toBe(true);
      expect(
        createVlanBodySchema.safeParse({ vlanId: 4094, name: "max" }).success,
      ).toBe(true);
    });

    it("rejects vlanId of 0 (below range)", () => {
      const r = createVlanBodySchema.safeParse({ vlanId: 0, name: "x" });
      expect(r.success).toBe(false);
    });

    it("rejects vlanId of 4095 (above range)", () => {
      const r = createVlanBodySchema.safeParse({ vlanId: 4095, name: "x" });
      expect(r.success).toBe(false);
    });

    it("rejects a non-integer vlanId", () => {
      const r = createVlanBodySchema.safeParse({ vlanId: 10.5, name: "x" });
      expect(r.success).toBe(false);
    });

    it("rejects an empty name", () => {
      const r = createVlanBodySchema.safeParse({ vlanId: 10, name: "" });
      expect(r.success).toBe(false);
    });

    it("rejects a name with control characters", () => {
      const r = createVlanBodySchema.safeParse({
        vlanId: 10,
        name: "Users\nshutdown",
      });
      expect(r.success).toBe(false);
    });

    it("rejects a name with a NUL byte", () => {
      const r = createVlanBodySchema.safeParse({
        vlanId: 10,
        name: "Users\0",
      });
      expect(r.success).toBe(false);
    });

    it("rejects a name over the 40-char cap", () => {
      const r = createVlanBodySchema.safeParse({
        vlanId: 10,
        name: "n".repeat(41),
      });
      expect(r.success).toBe(false);
    });

    it("rejects an out-of-set purpose", () => {
      const r = createVlanBodySchema.safeParse({
        vlanId: 10,
        name: "Users",
        purpose: "backbone",
      });
      expect(r.success).toBe(false);
    });

    it("rejects an out-of-set color", () => {
      const r = createVlanBodySchema.safeParse({
        vlanId: 10,
        name: "Users",
        color: "magenta",
      });
      expect(r.success).toBe(false);
    });

    it("rejects unknown keys (strict)", () => {
      const r = createVlanBodySchema.safeParse({
        vlanId: 10,
        name: "Users",
        organizationId: "x",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("updateVlanBodySchema", () => {
    it("accepts an empty body", () => {
      expect(updateVlanBodySchema.safeParse({}).success).toBe(true);
    });

    it("accepts a vlanId-only update", () => {
      const r = updateVlanBodySchema.safeParse({ vlanId: 200 });
      expect(r.success).toBe(true);
    });

    it("re-applies the vlanId range on update", () => {
      const r = updateVlanBodySchema.safeParse({ vlanId: 9999 });
      expect(r.success).toBe(false);
    });

    it("re-applies the control-char rule on update", () => {
      const r = updateVlanBodySchema.safeParse({ name: "bad\rname" });
      expect(r.success).toBe(false);
    });
  });

  describe("vlanResponseSchema", () => {
    it("parses a row and serializes createdAt to ISO", () => {
      const r = vlanResponseSchema.safeParse({
        id: "x",
        vlanId: 100,
        name: "Users",
        description: "",
        color: "purple",
        purpose: "user",
        createdAt: new Date("2026-02-03T04:05:06.000Z"),
      });
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.createdAt).toBe("2026-02-03T04:05:06.000Z");
    });

    it("rejects an out-of-range vlanId in the response", () => {
      const r = vlanResponseSchema.safeParse({
        id: "x",
        vlanId: 5000,
        name: "Users",
        description: "",
        color: "purple",
        purpose: "user",
        createdAt: new Date(),
      });
      expect(r.success).toBe(false);
    });
  });

  describe("listVlansQuerySchema", () => {
    it("applies defaults", () => {
      const r = listVlansQuerySchema.safeParse({});
      expect(r.success).toBe(true);
      if (!r.success) return;
      expect(r.data.limit).toBe(50);
    });

    it("accepts a valid purpose filter", () => {
      const r = listVlansQuerySchema.safeParse({ purpose: "iot" });
      expect(r.success).toBe(true);
    });

    it("rejects an out-of-set purpose filter", () => {
      const r = listVlansQuerySchema.safeParse({ purpose: "nope" });
      expect(r.success).toBe(false);
    });
  });
});
