import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Add .openapi() to every Zod schema. Idempotent — safe if called twice.
extendZodWithOpenApi(z);

/**
 * Shared registry. Every schema module in `src/lib/api/schemas/*.ts` and
 * every route file imports this and calls `registry.register*`. The spec
 * is built once per HTTP request to /api/v1/openapi.json; caching is
 * handled by Next's route-handler response headers.
 */
export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  description:
    "API key issued from Settings → API Keys. Format `rs_live_<43 chars>`.",
});

export function buildOpenApiSpec() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "RackSmith API",
      version: "1.0.0-beta",
      description:
        "Public REST API for RackSmith. v1 is beta — breaking changes possible until GA.",
      contact: {
        name: "RackSmith",
        url: "https://github.com/NindroidA/racksmith",
      },
    },
    servers: [{ url: "/" }],
  });
}
