import { describe, expect, it } from "vitest";
import {
  paginationQuerySchema,
  paginationResponseSchema,
  errorEnvelopeSchema,
} from "./shared";

describe("paginationQuerySchema", () => {
  it("coerces limit/offset strings to numbers", () => {
    const p = paginationQuerySchema.parse({ limit: "25", offset: "50" });
    expect(p.limit).toBe(25);
    expect(p.offset).toBe(50);
  });
  it("defaults limit=50, offset=0", () => {
    const p = paginationQuerySchema.parse({});
    expect(p.limit).toBe(50);
    expect(p.offset).toBe(0);
  });
  it("rejects limit > 200", () => {
    expect(() => paginationQuerySchema.parse({ limit: "500" })).toThrow();
  });
});

describe("errorEnvelopeSchema", () => {
  it("accepts the documented shape", () => {
    const ok = errorEnvelopeSchema.parse({
      error: {
        code: "not_found",
        message: "x",
        fields: [],
        requestId: "req_1",
      },
    });
    expect(ok.error.code).toBe("not_found");
  });
});
