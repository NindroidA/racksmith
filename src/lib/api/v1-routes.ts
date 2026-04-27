import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { registerRoutes as registerRacks } from "@/app/api/v1/racks/route";
import { registerRoutes as registerRackDetail } from "@/app/api/v1/racks/[id]/route";
import { registerRoutes as registerDevices } from "@/app/api/v1/devices/route";
import { registerRoutes as registerDeviceDetail } from "@/app/api/v1/devices/[id]/route";

/**
 * Every v1 route's `registerRoutes` function. Adding a new endpoint?
 * Add its `registerRoutes` here so the OpenAPI spec covers it. The
 * companion `tests/integration/openapi-spec-coverage.test.ts` walks
 * `src/app/api/v1/*` on disk and asserts each route appears in the
 * generated spec — forgetting an entry here makes that test fail.
 */
const V1_ROUTE_REGISTRARS: Array<(registry: OpenAPIRegistry) => void> = [
  registerRacks,
  registerRackDetail,
  registerDevices,
  registerDeviceDetail,
];

// Idempotent per registry instance — protects against double-call from
// module reloads (HMR) or test setup. Without this, the underlying
// OpenAPIRegistry would emit duplicate path entries.
const registeredOn = new WeakSet<OpenAPIRegistry>();

export function registerV1Routes(registry: OpenAPIRegistry): void {
  if (registeredOn.has(registry)) return;
  registeredOn.add(registry);
  for (const register of V1_ROUTE_REGISTRARS) {
    register(registry);
  }
}
