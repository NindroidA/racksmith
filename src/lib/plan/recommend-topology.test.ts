import { describe, expect, it } from "vitest";
import { recommendRackSizeU, recommendTopology } from "./recommend-topology";

describe("recommendTopology", () => {
  it("returns empty when device count is zero", () => {
    expect(
      recommendTopology({
        siteType: "home",
        deviceCount: 0,
        poeBudgetW: 0,
        uplinkSpeed: "1G",
        growthMultiplier: 1,
      }),
    ).toHaveLength(0);
  });

  it("scales access switch count by projected device count", () => {
    const devices = recommendTopology({
      siteType: "small_office",
      deviceCount: 50,
      poeBudgetW: 200,
      uplinkSpeed: "1G",
      growthMultiplier: 2, // 100 devices projected
    });
    const switchCount = devices.filter((d) => d.deviceType === "switch").length;
    // 100 ÷ 24 = 4.16 → ceil → 5
    expect(switchCount).toBe(5);
  });

  it("includes a firewall and at least one AP", () => {
    const devices = recommendTopology({
      siteType: "home",
      deviceCount: 10,
      poeBudgetW: 60,
      uplinkSpeed: "1G",
      growthMultiplier: 1,
    });
    expect(devices.some((d) => d.deviceType === "firewall")).toBe(true);
    expect(devices.some((d) => d.deviceType === "other")).toBe(true);
  });

  it("upgrades the access-switch class for 10G uplink", () => {
    const oneG = recommendTopology({
      siteType: "small_office",
      deviceCount: 12,
      poeBudgetW: 100,
      uplinkSpeed: "1G",
      growthMultiplier: 1,
    });
    const tenG = recommendTopology({
      siteType: "small_office",
      deviceCount: 12,
      poeBudgetW: 100,
      uplinkSpeed: "10G",
      growthMultiplier: 1,
    });
    const oneGSwitch = oneG.find((d) => d.deviceType === "switch");
    const tenGSwitch = tenG.find((d) => d.deviceType === "switch");
    expect(oneGSwitch?.model).not.toBe(tenGSwitch?.model);
  });
});

describe("recommendRackSizeU", () => {
  it("returns the smallest standard size that holds devices + 4U", () => {
    expect(
      recommendRackSizeU([
        { manufacturer: "x", model: "y", deviceType: "switch", sizeU: 1, portCount: 24, powerWatts: null, reason: "" },
        { manufacturer: "x", model: "y", deviceType: "switch", sizeU: 1, portCount: 24, powerWatts: null, reason: "" },
        { manufacturer: "x", model: "y", deviceType: "firewall", sizeU: 1, portCount: 9, powerWatts: null, reason: "" },
      ]),
    ).toBe(12);
  });

  it("handles zero-U devices (APs etc)", () => {
    expect(
      recommendRackSizeU([
        { manufacturer: "x", model: "y", deviceType: "other", sizeU: 0, portCount: 1, powerWatts: null, reason: "" },
      ]),
    ).toBe(12);
  });
});
