import { describe, expect, it } from "vitest";
import {
  getVlanTemplate,
  VLAN_TEMPLATES,
  type VlanTemplate,
  type VlanTemplateEntry,
} from "./templates";

const VALID_PURPOSES: ReadonlySet<VlanTemplateEntry["purpose"]> = new Set([
  "user",
  "management",
  "iot",
  "guest",
  "voip",
  "storage",
  "other",
]);

const VALID_COLOR_TAGS: ReadonlySet<VlanTemplateEntry["colorTag"]> = new Set([
  "blue",
  "purple",
  "cyan",
  "green",
  "orange",
  "red",
]);

const VALID_AUDIENCES: ReadonlySet<VlanTemplate["audience"]> = new Set([
  "homelab",
  "small_it",
  "msp",
  "any",
]);

describe("VLAN_TEMPLATES", () => {
  it("exposes a non-empty array of templates", () => {
    expect(Array.isArray(VLAN_TEMPLATES)).toBe(true);
    expect(VLAN_TEMPLATES.length).toBeGreaterThan(0);
  });

  it("has unique template ids", () => {
    const ids = VLAN_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ships the three expected starter schemes", () => {
    const ids = VLAN_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual(["three-tier", "home", "msp-5"]);
  });

  it.each(VLAN_TEMPLATES.map((t) => [t.id, t] as const))(
    "template %s has valid top-level metadata",
    (_id, template) => {
      expect(template.id.trim().length).toBeGreaterThan(0);
      expect(template.label.trim().length).toBeGreaterThan(0);
      expect(template.blurb.trim().length).toBeGreaterThan(0);
      expect(VALID_AUDIENCES.has(template.audience)).toBe(true);
      expect(template.entries.length).toBeGreaterThan(0);
    },
  );

  it.each(VLAN_TEMPLATES.map((t) => [t.id, t] as const))(
    "template %s has valid VLAN entries",
    (_id, template) => {
      for (const entry of template.entries) {
        // VLAN ids must be in the valid 802.1Q range (1-4094).
        expect(Number.isInteger(entry.vlanId)).toBe(true);
        expect(entry.vlanId).toBeGreaterThanOrEqual(1);
        expect(entry.vlanId).toBeLessThanOrEqual(4094);
        // Names + descriptions must be non-empty.
        expect(entry.name.trim().length).toBeGreaterThan(0);
        expect(entry.description.trim().length).toBeGreaterThan(0);
        // Purpose + colorTag must be in the supported unions.
        expect(VALID_PURPOSES.has(entry.purpose)).toBe(true);
        expect(VALID_COLOR_TAGS.has(entry.colorTag)).toBe(true);
      }
    },
  );

  it.each(VLAN_TEMPLATES.map((t) => [t.id, t] as const))(
    "template %s has unique vlan ids within the scheme",
    (_id, template) => {
      const vlanIds = template.entries.map((e) => e.vlanId);
      expect(new Set(vlanIds).size).toBe(vlanIds.length);
    },
  );

  it("never places entries on the reserved default VLAN 1", () => {
    for (const template of VLAN_TEMPLATES) {
      for (const entry of template.entries) {
        expect(entry.vlanId).not.toBe(1);
      }
    }
  });

  it("three-tier scheme matches its documented VLANs", () => {
    const template = VLAN_TEMPLATES.find((t) => t.id === "three-tier");
    expect(template).toBeDefined();
    expect(template?.audience).toBe("small_it");
    expect(template?.entries.map((e) => [e.vlanId, e.name, e.purpose])).toEqual([
      [10, "Mgmt", "management"],
      [20, "Servers", "storage"],
      [30, "Users", "user"],
    ]);
  });

  it("home scheme isolates IoT and guest from the trusted network", () => {
    const template = VLAN_TEMPLATES.find((t) => t.id === "home");
    expect(template).toBeDefined();
    expect(template?.audience).toBe("homelab");
    const purposes = template?.entries.map((e) => e.purpose) ?? [];
    expect(purposes).toContain("iot");
    expect(purposes).toContain("guest");
    expect(purposes).toContain("user");
  });

  it("msp-5 scheme covers five common traffic classes", () => {
    const template = VLAN_TEMPLATES.find((t) => t.id === "msp-5");
    expect(template).toBeDefined();
    expect(template?.audience).toBe("msp");
    expect(template?.entries).toHaveLength(5);
    expect(template?.entries.map((e) => e.purpose)).toEqual([
      "management",
      "user",
      "guest",
      "voip",
      "storage",
    ]);
  });
});

describe("getVlanTemplate", () => {
  it("returns the matching template by id", () => {
    const template = getVlanTemplate("three-tier");
    expect(template).toBeDefined();
    expect(template?.id).toBe("three-tier");
    expect(template?.label).toBe("3-Tier (Mgmt / Server / User)");
  });

  it("returns the same object reference held in VLAN_TEMPLATES", () => {
    const template = getVlanTemplate("home");
    expect(template).toBe(VLAN_TEMPLATES.find((t) => t.id === "home"));
  });

  it("resolves every shipped template id", () => {
    for (const known of VLAN_TEMPLATES) {
      expect(getVlanTemplate(known.id)?.id).toBe(known.id);
    }
  });

  it("returns undefined for an unknown id", () => {
    expect(getVlanTemplate("does-not-exist")).toBeUndefined();
  });

  it("returns undefined for an empty id", () => {
    expect(getVlanTemplate("")).toBeUndefined();
  });

  it("is case-sensitive on the id", () => {
    expect(getVlanTemplate("THREE-TIER")).toBeUndefined();
    expect(getVlanTemplate("Home")).toBeUndefined();
  });
});
