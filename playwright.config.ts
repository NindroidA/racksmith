import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.E2E_PORT || "3010";
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `PORT=${PORT} bun run dev`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://racksmith:racksmith@localhost:5432/racksmith?schema=public",
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ||
        "e2e-test-secret-not-for-production-abcdef123456",
      BETTER_AUTH_URL: BASE_URL,
    },
  },
});
