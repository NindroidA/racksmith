import { describe, expect, it } from "vitest";
import {
  OWNERSHIP_TRANSFER_TTL_DAYS,
  OWNERSHIP_TRANSFER_TTL_MS,
} from "./ownership-transfer-constants";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe("ownership-transfer constants", () => {
  it("ms and days values stay in sync", () => {
    expect(OWNERSHIP_TRANSFER_TTL_MS).toBe(
      OWNERSHIP_TRANSFER_TTL_DAYS * ONE_DAY_MS,
    );
  });

  it("ms value is positive", () => {
    expect(OWNERSHIP_TRANSFER_TTL_MS).toBeGreaterThan(0);
  });

  it("days value is a whole number (UI copy renders as 'N days')", () => {
    expect(Number.isInteger(OWNERSHIP_TRANSFER_TTL_DAYS)).toBe(true);
  });
});
