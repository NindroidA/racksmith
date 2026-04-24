import { test, expect, type Page } from "@playwright/test";

const RUN_ID = Date.now().toString(36);
const TEST_EMAIL = `e2e-${RUN_ID}@racksmith.local`;
const TEST_PASSWORD = "e2e-smoke-pass-987654";
const TEST_NAME = "E2E Smoke";

// After a fresh signup, a new user traverses two onboarding gates:
//   1. /onboarding/welcome — auto-creates a personal org + shows a "Skip to
//      dashboard" link. Server-side redirect from /dashboard lands here when
//      User.activeOrganizationId is null.
//   2. Profile quiz modal on /dashboard — rendered by DashboardShell as a
//      fixed-inset overlay (z-65) when User.profileCompletedAt is null. If
//      left open, it intercepts pointer events on every dashboard route.
//
// Gate 1 is handled in test 1 (registration) so that Dashboard heading is
// reachable. Gate 2 is dismissed at the start of test 2 (post-login) rather
// than in test 1 — attempting to click the quiz's Skip button during the
// /dashboard route's first compile in turbopack dev mode is flaky (streaming
// SSR + Fast Refresh can flicker the modal and detach the button mid-click).
// By test 2, /dashboard is already compiled, the modal click is stable, and
// saveProfile stamps profileCompletedAt so the modal won't appear in tests 3/4.
async function dismissProfileQuizIfOpen(page: Page) {
  const dialog = page.getByRole("dialog", { name: /welcome to racksmith/i });
  if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await dialog.getByRole("button", { name: /skip.*explore/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
  }
}

test.describe.serial("Auth + core CRUD smoke flow", () => {
  test("register a new account and land on the dashboard", async ({ page }) => {
    await page.goto("/register");
    await page.getByPlaceholder("Your name").fill(TEST_NAME);
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("Min 8 characters").fill(TEST_PASSWORD);
    await page.getByPlaceholder("Re-enter password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();

    // Gate 1: /onboarding/welcome auto-creates the user's org on first load,
    // then renders a "Skip to dashboard" link. URL-based checks race against
    // Next.js streaming SSR (URL can flick to /dashboard then back to
    // /onboarding/welcome before content renders), so wait for content instead.
    const welcomeLink = page.getByRole("link", { name: /skip to dashboard/i });
    const dashboardHeading = page.getByRole("heading", { name: "Dashboard" });
    // Catch the losing branch so its rejection after the race resolves
    // doesn't surface as an unhandled rejection and flakify the run.
    await Promise.race([
      welcomeLink
        .waitFor({ state: "visible", timeout: 20_000 })
        .catch(() => undefined),
      dashboardHeading
        .waitFor({ state: "visible", timeout: 20_000 })
        .catch(() => undefined),
    ]);
    if (await welcomeLink.isVisible().catch(() => false)) {
      await welcomeLink.click();
      await dashboardHeading.waitFor({ state: "visible", timeout: 20_000 });
    }

    await expect(dashboardHeading).toBeVisible();
  });

  test("create a rack from the rack-creation page", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("Enter your password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/dashboard");
    await dismissProfileQuizIfOpen(page);

    await page.goto("/racks/new");
    // Next.js client-side transitions can briefly keep the previous page's DOM
    // alongside the new one — waiting for network idle ensures the old form
    // has detached before we match placeholders (see strict-mode ambiguity).
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder(/Main Rack/i).fill("Smoke Test Rack");

    // sizeU is the number input — find it via type
    const sizeInput = page.locator('input[type="number"]').first();
    await sizeInput.fill("12");

    await page.getByRole("button", { name: /create|save/i }).click();

    // Lands on /racks/{id}. Explicitly exclude /racks/new from the match —
    // otherwise waitForURL resolves against our current URL before the server
    // action's router.push fires, and the next assertion races with navigation.
    await page.waitForURL(
      (url) =>
        /^\/racks\/[a-z0-9]+$/.test(url.pathname) &&
        url.pathname !== "/racks/new",
      { timeout: 15_000 },
    );
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
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder(/Main Switch/i).fill("Smoke Switch");

    // Select device type "switch" via the custom combobox (not a native
    // <select>, so `selectOption` doesn't apply).
    await page.getByRole("combobox", { name: /Type/i }).click();
    await page.getByRole("option", { name: "Switch", exact: true }).click();

    await page
      .getByRole("button", { name: /create device|save/i })
      .first()
      .click();

    // Lands on /devices/{id}. Same trap as test 2 — the naive
    // /\/devices(?:\/[^/]+)?$/ pattern matches /devices/new and resolves
    // before the server action has pushed the new URL.
    await page.waitForURL(
      (url) =>
        /^\/devices\/[^/]+$/.test(url.pathname) &&
        url.pathname !== "/devices/new",
      { timeout: 15_000 },
    );
    await page.goto("/devices");
    await page.waitForLoadState("networkidle");
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
