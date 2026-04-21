import { test, expect } from "@playwright/test";

const RUN_ID = Date.now().toString(36);
const TEST_EMAIL = `e2e-${RUN_ID}@racksmith.local`;
const TEST_PASSWORD = "e2e-smoke-pass-987654";
const TEST_NAME = "E2E Smoke";

test.describe.serial("Auth + core CRUD smoke flow", () => {
  test("register a new account and land on the dashboard", async ({ page }) => {
    await page.goto("/register");
    await page.getByPlaceholder("Your name").fill(TEST_NAME);
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("Min 8 characters").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();

    await page.waitForURL("/dashboard", { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
  });

  test("create a rack from the rack-creation page", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("Enter your password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/dashboard");

    await page.goto("/racks/new");
    await page.getByPlaceholder(/Main Rack/i).fill("Smoke Test Rack");

    // sizeU is the number input — find it via type
    const sizeInput = page.locator('input[type="number"]').first();
    await sizeInput.fill("12");

    await page.getByRole("button", { name: /create|save/i }).click();

    // Lands on /racks/{id}
    await page.waitForURL(/\/racks\/[a-z0-9]+$/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Smoke Test Rack" }),
    ).toBeVisible();
  });

  test("create a device manually", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("Enter your password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/dashboard");

    await page.goto("/devices/new");
    await page.getByPlaceholder(/Main Switch/i).fill("Smoke Switch");

    // Select device type "switch"
    const typeSelect = page.locator("select").first();
    await typeSelect.selectOption({ value: "switch" });

    await page
      .getByRole("button", { name: /create device|save/i })
      .first()
      .click();

    await page.waitForURL(/\/devices(?:\/[^/]+)?$/, { timeout: 15_000 });
    await page.goto("/devices");
    await expect(page.getByText("Smoke Switch")).toBeVisible();
  });

  test("dashboard shows the recent activity from above", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("Enter your password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Recent activity" }),
    ).toBeVisible();
    await expect(page.getByText("Smoke Test Rack")).toBeVisible();
    await expect(page.getByText("Smoke Switch")).toBeVisible();
  });
});
