import { buildOpenApiSpec, registry } from "@/lib/api/openapi-registry";
import { registerV1Routes } from "@/lib/api/v1-routes";

// Register every v1 route's OpenAPI descriptors against the shared
// registry once per worker. registerV1Routes is idempotent per registry
// instance, so HMR reloads don't duplicate entries.
registerV1Routes(registry);

export const dynamic = "force-static"; // spec is a pure function of code; cacheable

export async function GET() {
  const spec = buildOpenApiSpec();
  return new Response(JSON.stringify(spec, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control":
        process.env.NODE_ENV === "production"
          ? "public, max-age=300, stale-while-revalidate=3600"
          : "no-cache",
    },
  });
}
