import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "tests/e2e/**",
      "playwright-report/**",
    ],
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
