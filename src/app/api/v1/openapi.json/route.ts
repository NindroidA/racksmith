import { buildOpenApiSpec } from "@/lib/api/openapi-registry";
// Side-effect imports — importing each route file runs its
// `registry.registerPath(...)` calls. Without this, the spec would be
// empty (no paths registered).
import "@/app/api/v1/racks/route";
import "@/app/api/v1/racks/[id]/route";
import "@/app/api/v1/devices/route";
import "@/app/api/v1/devices/[id]/route";

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
