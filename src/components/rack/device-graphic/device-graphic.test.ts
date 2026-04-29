import { afterEach, describe, expect, it } from "vitest";
import type { ComponentType } from "react";
import { pickModelComponent, type DeviceGraphicProps } from "./device-graphic";
import { MODEL_SPECIFIC } from "./models";

/**
 * Phase A guarantees the v2 dispatch infrastructure works *before* any
 * Tier 1 model components land. Until Phase B starts populating
 * `MODEL_SPECIFIC`, the map is empty and every lookup must return
 * `null` so callers fall through to the type-template path.
 *
 * These tests assert the dispatch contract directly; the per-model
 * components themselves get covered when they're added in B/C.
 */

// Stand-in for a future per-model component. We never actually render
// it — the dispatch only returns a reference, so a no-op typed
// placeholder is enough.
const FakeUdmPro: ComponentType<DeviceGraphicProps> = () => null;
const FakeC9300: ComponentType<DeviceGraphicProps> = () => null;

describe("pickModelComponent", () => {
  // Each test mutates the shared MODEL_SPECIFIC map. Snapshot the full
  // map (keys + values) at suite-start and restore it after every test
  // so that once Phase B/C populates real entries, mutations in this
  // file can't leak into other tests.
  const originalModelSpecific = { ...MODEL_SPECIFIC };
  afterEach(() => {
    for (const k of Object.keys(MODEL_SPECIFIC)) {
      delete MODEL_SPECIFIC[k];
    }
    Object.assign(MODEL_SPECIFIC, originalModelSpecific);
  });

  it("returns null when MODEL_SPECIFIC has no matching key (Phase A baseline)", () => {
    expect(pickModelComponent("ubiquiti", "UDM-Pro")).toBeNull();
    expect(pickModelComponent("cisco", "C9300-48P")).toBeNull();
  });

  it("returns null for empty manufacturer or model", () => {
    expect(pickModelComponent("", "UDM-Pro")).toBeNull();
    expect(pickModelComponent("ubiquiti", "")).toBeNull();
  });

  it("matches a registered key with case-folded manufacturer + exact model", () => {
    MODEL_SPECIFIC["ubiquiti:UDM-Pro"] = FakeUdmPro;

    // Lower-case manufacturer (canonical input)
    expect(pickModelComponent("ubiquiti", "UDM-Pro")).toBe(FakeUdmPro);
    // Mixed-case manufacturer should still match (lookup case-folds the
    // manufacturer side, matching how BRAND_PALETTES is keyed).
    expect(pickModelComponent("Ubiquiti", "UDM-Pro")).toBe(FakeUdmPro);
    expect(pickModelComponent("UBIQUITI", "UDM-Pro")).toBe(FakeUdmPro);
  });

  it("does NOT case-fold the model side (catalog model strings are exact)", () => {
    MODEL_SPECIFIC["ubiquiti:UDM-Pro"] = FakeUdmPro;

    // Lower-case model is a different key — should miss.
    expect(pickModelComponent("ubiquiti", "udm-pro")).toBeNull();
    expect(pickModelComponent("ubiquiti", "UDM-PRO")).toBeNull();
  });

  it("returns null when manufacturer matches but model doesn't", () => {
    MODEL_SPECIFIC["cisco:C9300-48P"] = FakeC9300;

    expect(pickModelComponent("cisco", "C9300-48P")).toBe(FakeC9300);
    // Sibling model (also Cisco) without a registered component should
    // still return null so the caller falls through to the type
    // template.
    expect(pickModelComponent("cisco", "C9200L-24T")).toBeNull();
    // Made-up model variant (e.g. catalog typo or future SKU) → null.
    expect(pickModelComponent("cisco", "C9300-48P-Rev2")).toBeNull();
  });

  it("returns null when the manufacturer is unknown to the palette system", () => {
    // Even if a `MODEL_SPECIFIC` entry happens to exist for an unknown
    // vendor, the dispatch must reject it — per-model components depend
    // on a real `BRAND_PALETTES` entry, and falling through to the type
    // template is the correct behavior. Register a key under an unknown
    // vendor and assert lookup still returns null.
    const FakeAcme: ComponentType<DeviceGraphicProps> = () => null;
    MODEL_SPECIFIC["acme-corp:Anything"] = FakeAcme;
    expect(pickModelComponent("acme-corp", "Anything")).toBeNull();
  });
});
