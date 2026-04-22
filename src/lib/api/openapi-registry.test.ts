import { describe, expect, it } from "vitest";
import { buildOpenApiSpec, registry } from "./openapi-registry";

describe("openapi-registry", () => {
  it("produces an OpenAPI 3.1 document", () => {
    const spec = buildOpenApiSpec();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("RackSmith API");
    expect(spec.info.version).toBe("1.0.0-beta");
  });
  it("registers the bearerAuth security scheme", () => {
    const spec = buildOpenApiSpec();
    expect(spec.components?.securitySchemes?.bearerAuth).toEqual({
      type: "http",
      scheme: "bearer",
      description: expect.any(String),
    });
  });
  it("exports a shared registry instance", () => {
    expect(registry).toBeDefined();
  });
});
