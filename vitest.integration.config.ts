import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest config for the cross-tenant isolation integration suite. Run via
 * `bun run test:integration`. Requires the test Postgres container from
 * `docker-compose.test.yml` to be running on port 5433.
 *
 * Tests live under `tests/integration/` and exercise the live DB with RLS
 * actively enforced — they are SLOW relative to the unit suite, so kept
 * out of the default `bun run test` invocation.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["./tests/integration/global-setup.ts"],
    setupFiles: ["./tests/integration/per-test-setup.ts"],
    // RLS + Postgres connections aren't process-safe under parallel
    // execution; serialize for predictability. Suite is small enough that
    // the wall-clock penalty is negligible.
    pool: "forks",
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    env: {
      // App connection — restricted role so RLS actually enforces. Mirrors
      // the prod role split (racksmith_app vs racksmith).
      DATABASE_URL:
        "postgresql://racksmith_test_app:racksmith_test_app@localhost:5433/racksmith_test?schema=public",
      // Migrations + raw setup — superuser.
      DIRECT_URL:
        "postgresql://racksmith_test:racksmith_test@localhost:5433/racksmith_test?schema=public",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` is a Next.js runtime guard with no test surface — alias
      // it to an empty module so server modules can be imported in tests.
      "server-only": path.resolve(__dirname, "./tests/integration/empty.ts"),
    },
  },
});
