import { describe, expect, it } from "vitest";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { buildOpenApiSpec } from "@/lib/api/openapi-registry";
// side-effect: register all routes' paths
import "@/app/api/v1/racks/route";
import "@/app/api/v1/racks/[id]/route";
import "@/app/api/v1/devices/route";
import "@/app/api/v1/devices/[id]/route";

describe("OpenAPI contract", () => {
  it("produces a valid OpenAPI 3.1 document", () => {
    const spec = buildOpenApiSpec();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  it("every path has at least one response schema", () => {
    const spec = buildOpenApiSpec();
    for (const [path, methods] of Object.entries(spec.paths ?? {})) {
      for (const [method, op] of Object.entries(methods as Record<string, unknown>)) {
        if (typeof op !== "object" || !op) continue;
        expect(
          (op as { responses?: unknown }).responses,
          `${method.toUpperCase()} ${path}`,
        ).toBeDefined();
      }
    }
  });

  it("bearerAuth applied to every path except /docs and /openapi.json", () => {
    const spec = buildOpenApiSpec();
    for (const [path, methods] of Object.entries(spec.paths ?? {})) {
      if (path.includes("/docs") || path.includes("/openapi.json")) continue;
      for (const [, op] of Object.entries(methods as Record<string, unknown>)) {
        if (typeof op !== "object" || !op) continue;
        const sec = (op as { security?: unknown[] }).security;
        expect(sec, `path ${path}`).toEqual(
          expect.arrayContaining([expect.objectContaining({ bearerAuth: [] })]),
        );
      }
    }
  });

  it("Rack component schema validates a sample instance", () => {
    const spec = buildOpenApiSpec();
    const ajv = new Ajv({ strict: false });
    addFormats(ajv);
    const rackSchema = (spec.components?.schemas as Record<string, unknown> | undefined)?.Rack;
    expect(rackSchema).toBeDefined();
    const validate = ajv.compile(rackSchema as object);
    const sample = {
      id: "ckabcde12345678901234567",
      name: "R1",
      sizeU: 42,
      location: null,
      color: "blue",
      createdAt: "2026-01-01T00:00:00Z",
    };
    expect(validate(sample)).toBe(true);
  });

  it("Device component schema validates a sample instance", () => {
    const spec = buildOpenApiSpec();
    const ajv = new Ajv({ strict: false });
    addFormats(ajv);
    const deviceSchema = (spec.components?.schemas as Record<string, unknown> | undefined)?.Device;
    expect(deviceSchema).toBeDefined();
    const validate = ajv.compile(deviceSchema as object);
    const sample = {
      id: "ckdevabcde12345678901234",
      name: "sw-1",
      deviceType: "switch",
      manufacturer: "",
      model: "",
      sizeU: 1,
      portCount: 24,
      powerWatts: null,
      rackId: null,
      positionU: null,
      ipAddress: null,
      macAddress: null,
      hostname: null,
      createdAt: "2026-01-01T00:00:00Z",
    };
    expect(validate(sample)).toBe(true);
  });
});
