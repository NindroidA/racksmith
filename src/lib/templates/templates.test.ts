import { describe, expect, it } from "vitest";
import { COLOR_TAGS, DEVICE_TYPES } from "@/types";
import { DEVICE_TEMPLATES, getDeviceTemplate } from "./devices";
import { RACK_TEMPLATES, getRackTemplate } from "./racks";

describe("DEVICE_TEMPLATES", () => {
  it("is a non-empty list", () => {
    expect(Array.isArray(DEVICE_TEMPLATES)).toBe(true);
    expect(DEVICE_TEMPLATES.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = DEVICE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has non-empty id, name, and blurb for every template", () => {
    for (const t of DEVICE_TEMPLATES) {
      expect(t.id.trim().length).toBeGreaterThan(0);
      expect(t.name.trim().length).toBeGreaterThan(0);
      expect(t.blurb.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses only known device types", () => {
    for (const t of DEVICE_TEMPLATES) {
      expect(DEVICE_TYPES).toContain(t.deviceType as (typeof DEVICE_TYPES)[number]);
    }
  });

  it("has sane sizeU (positive integer within rack bounds)", () => {
    for (const t of DEVICE_TEMPLATES) {
      expect(Number.isInteger(t.sizeU)).toBe(true);
      expect(t.sizeU).toBeGreaterThanOrEqual(1);
      expect(t.sizeU).toBeLessThanOrEqual(60);
    }
  });

  it("has non-negative integer portCount", () => {
    for (const t of DEVICE_TEMPLATES) {
      expect(Number.isInteger(t.portCount)).toBe(true);
      expect(t.portCount).toBeGreaterThanOrEqual(0);
    }
  });

  it("has powerWatts that is either null or a positive number", () => {
    for (const t of DEVICE_TEMPLATES) {
      if (t.powerWatts !== null) {
        expect(typeof t.powerWatts).toBe("number");
        expect(t.powerWatts).toBeGreaterThan(0);
      }
    }
  });

  it("covers both the powerWatts=number and powerWatts=null branches", () => {
    const withPower = DEVICE_TEMPLATES.filter((t) => t.powerWatts !== null);
    const withoutPower = DEVICE_TEMPLATES.filter((t) => t.powerWatts === null);
    expect(withPower.length).toBeGreaterThan(0);
    expect(withoutPower.length).toBeGreaterThan(0);
  });
});

describe("getDeviceTemplate", () => {
  it("returns the matching template for a known id", () => {
    const t = getDeviceTemplate("switch-24-port");
    expect(t).toBeDefined();
    expect(t).toMatchObject({
      id: "switch-24-port",
      name: "24-Port Switch",
      deviceType: "switch",
      sizeU: 1,
      portCount: 24,
      powerWatts: 45,
    });
  });

  it("returns the same object reference held in DEVICE_TEMPLATES", () => {
    const t = getDeviceTemplate("server-1u");
    expect(t).toBe(DEVICE_TEMPLATES.find((d) => d.id === "server-1u"));
  });

  it("resolves a template whose powerWatts is null (PDU branch)", () => {
    const t = getDeviceTemplate("pdu-switched");
    expect(t).toBeDefined();
    expect(t?.powerWatts).toBeNull();
    expect(t?.deviceType).toBe("pdu");
  });

  it("returns undefined for an unknown id", () => {
    expect(getDeviceTemplate("does-not-exist")).toBeUndefined();
  });

  it("returns undefined for an empty id", () => {
    expect(getDeviceTemplate("")).toBeUndefined();
  });

  it("is case-sensitive (no fuzzy match)", () => {
    expect(getDeviceTemplate("SWITCH-24-PORT")).toBeUndefined();
  });

  it("resolves every id advertised in DEVICE_TEMPLATES", () => {
    for (const t of DEVICE_TEMPLATES) {
      expect(getDeviceTemplate(t.id)).toBe(t);
    }
  });
});

describe("RACK_TEMPLATES", () => {
  it("is a non-empty list", () => {
    expect(Array.isArray(RACK_TEMPLATES)).toBe(true);
    expect(RACK_TEMPLATES.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = RACK_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has non-empty id, name, blurb, location, and description", () => {
    for (const t of RACK_TEMPLATES) {
      expect(t.id.trim().length).toBeGreaterThan(0);
      expect(t.name.trim().length).toBeGreaterThan(0);
      expect(t.blurb.trim().length).toBeGreaterThan(0);
      expect(t.location.trim().length).toBeGreaterThan(0);
      expect(t.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("has sane sizeU (positive integer within rack bounds)", () => {
    for (const t of RACK_TEMPLATES) {
      expect(Number.isInteger(t.sizeU)).toBe(true);
      expect(t.sizeU).toBeGreaterThanOrEqual(1);
      expect(t.sizeU).toBeLessThanOrEqual(60);
    }
  });

  it("uses only known color tags", () => {
    for (const t of RACK_TEMPLATES) {
      expect(COLOR_TAGS).toContain(t.colorTag);
    }
  });

  it("uses only valid audience values", () => {
    const audiences = new Set(["homelab", "small_it", "msp", "any"]);
    for (const t of RACK_TEMPLATES) {
      expect(audiences.has(t.audience)).toBe(true);
    }
  });
});

describe("getRackTemplate", () => {
  it("returns the matching template for a known id", () => {
    const t = getRackTemplate("homelab-12u");
    expect(t).toBeDefined();
    expect(t).toMatchObject({
      id: "homelab-12u",
      name: "Homelab Rack",
      sizeU: 12,
      colorTag: "blue",
      location: "Home",
      audience: "homelab",
    });
  });

  it("returns the same object reference held in RACK_TEMPLATES", () => {
    const t = getRackTemplate("mdf-42u");
    expect(t).toBe(RACK_TEMPLATES.find((r) => r.id === "mdf-42u"));
  });

  it("resolves a template with the 'any' audience branch", () => {
    const t = getRackTemplate("colo-42u");
    expect(t).toBeDefined();
    expect(t?.audience).toBe("any");
    expect(t?.sizeU).toBe(42);
  });

  it("returns undefined for an unknown id", () => {
    expect(getRackTemplate("nope")).toBeUndefined();
  });

  it("returns undefined for an empty id", () => {
    expect(getRackTemplate("")).toBeUndefined();
  });

  it("is case-sensitive (no fuzzy match)", () => {
    expect(getRackTemplate("HOMELAB-12U")).toBeUndefined();
  });

  it("resolves every id advertised in RACK_TEMPLATES", () => {
    for (const t of RACK_TEMPLATES) {
      expect(getRackTemplate(t.id)).toBe(t);
    }
  });
});
