import { describe, expect, it } from "vitest";
import {
  handleZodError,
  tierDenial,
  withActionEnvelope,
} from "./action-helpers";
import { ForbiddenError } from "./auth-helpers";
import { describeError } from "./error-message";

describe("describeError", () => {
  it("returns the Error's message when present", () => {
    expect(describeError(new Error("boom"), "fallback")).toBe("boom");
  });

  it("returns fallback when Error.message is empty string", () => {
    expect(describeError(new Error(""), "fallback")).toBe("fallback");
  });

  it("returns fallback for non-Error throws (string, null, undefined, object)", () => {
    expect(describeError("string error", "fb")).toBe("fb");
    expect(describeError(null, "fb")).toBe("fb");
    expect(describeError(undefined, "fb")).toBe("fb");
    expect(describeError({ code: "X" }, "fb")).toBe("fb");
  });

  it("preserves subclassed Errors", () => {
    class CustomError extends Error {}
    expect(describeError(new CustomError("custom"), "fb")).toBe("custom");
  });
});

describe("handleZodError", () => {
  it("extracts the first issue message from a ZodError-shaped object", () => {
    const zerr = { issues: [{ message: "Name is required" }] };
    expect(handleZodError(zerr)).toBe("Name is required");
  });

  it("returns 'Invalid input' when issues array is empty", () => {
    const zerr = { issues: [] };
    expect(handleZodError(zerr)).toBe("Invalid input");
  });

  it("returns the first issue when there are multiple", () => {
    const zerr = {
      issues: [{ message: "first" }, { message: "second" }],
    };
    expect(handleZodError(zerr)).toBe("first");
  });

  it("falls through to describeError for non-Zod throws", () => {
    expect(handleZodError(new Error("non-zod"))).toBe("non-zod");
    expect(handleZodError("string")).toBe("Unknown error");
    expect(handleZodError(null)).toBe("Unknown error");
  });
});

describe("tierDenial", () => {
  it("maps a denied check to ActionResult shape", () => {
    const result = tierDenial({
      ok: false,
      reason: "Free plan limited to 3 racks",
      resource: "racks",
      plan: "free",
      current: 3,
      limit: 3,
    });
    expect(result).toEqual({
      ok: false,
      error: "Free plan limited to 3 racks",
      limit: {
        resource: "racks",
        plan: "free",
        current: 3,
        max: 3, // note: `limit` from check → `max` on the wire
      },
    });
  });

  it("renames 'limit' on the input to 'max' on the output (UI contract)", () => {
    const result = tierDenial({
      ok: false,
      reason: "x",
      resource: "devices",
      plan: "pro",
      current: 100,
      limit: 100,
    });
    if (!result.ok) {
      expect(result.limit).toMatchObject({ max: 100 });
      expect(result.limit).not.toHaveProperty("limit");
    }
  });
});

describe("withActionEnvelope", () => {
  it("returns the inner ActionResult unchanged when fn resolves with ok:true", async () => {
    const result = await withActionEnvelope(
      async () => ({ ok: true as const, data: { id: "x" } }),
      "fallback",
    );
    expect(result).toEqual({ ok: true, data: { id: "x" } });
  });

  it("returns the inner ActionResult unchanged when fn resolves with ok:false (no throw)", async () => {
    const result = await withActionEnvelope(
      async () => ({ ok: false as const, error: "validation failed" }),
      "fallback",
    );
    expect(result).toEqual({ ok: false, error: "validation failed" });
  });

  it("collapses ForbiddenError into { ok: false, error: <message> }", async () => {
    const result = await withActionEnvelope(async () => {
      throw new ForbiddenError("This action requires admin or higher.");
    }, "fallback");
    expect(result).toEqual({
      ok: false,
      error: "This action requires admin or higher.",
    });
  });

  it("uses 'You don't have access' for ForbiddenError without message", async () => {
    const result = await withActionEnvelope(async () => {
      // Empty-string message → fall back to humane copy.
      throw new ForbiddenError("");
    }, "fallback");
    expect(result).toEqual({ ok: false, error: "You don't have access" });
  });

  it("collapses unexpected Error throws into { ok: false, error: <message> }", async () => {
    const result = await withActionEnvelope(async () => {
      throw new Error("Prisma timeout");
    }, "Failed to create device");
    expect(result).toEqual({ ok: false, error: "Prisma timeout" });
  });

  it("uses fallback when an Error throw has empty message", async () => {
    const result = await withActionEnvelope(async () => {
      throw new Error("");
    }, "Failed to create device");
    expect(result).toEqual({ ok: false, error: "Failed to create device" });
  });

  it("uses fallback when a non-Error value is thrown (string)", async () => {
    const result = await withActionEnvelope(async () => {
      throw "raw string";
    }, "Failed to create device");
    expect(result).toEqual({ ok: false, error: "Failed to create device" });
  });

  it("uses fallback when a non-Error value is thrown (null)", async () => {
    const result = await withActionEnvelope(async () => {
      throw null;
    }, "Failed to create device");
    expect(result).toEqual({ ok: false, error: "Failed to create device" });
  });

  it("preserves ForbiddenError subclass detection across the envelope", async () => {
    class StricterForbidden extends ForbiddenError {}
    const result = await withActionEnvelope(async () => {
      throw new StricterForbidden("nope");
    }, "fallback");
    expect(result).toEqual({ ok: false, error: "nope" });
  });

  it("does not mask the error type when ok:false is returned with a limit field", async () => {
    const result = await withActionEnvelope(
      async () => ({
        ok: false as const,
        error: "Free plan limited to 3 racks",
        limit: {
          resource: "racks" as const,
          plan: "free" as const,
          current: 3,
          max: 3,
        },
      }),
      "fallback",
    );
    if (!result.ok) {
      expect(result.limit?.resource).toBe("racks");
      expect(result.limit?.max).toBe(3);
    }
  });
});
