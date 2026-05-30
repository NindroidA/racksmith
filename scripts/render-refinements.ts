/**
 * Render the font-pairing comparison mockup.
 * Output: test-artifacts/screenshots/2026-05-17-refinements/fonts.png
 */

import { resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(".");

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1000, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const url = "file://" + resolve(ROOT, "mockups", "fonts-comparison.html");
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // give all four font files time to load
  const out = resolve(
    ROOT,
    "test-artifacts/screenshots/2026-05-17-refinements/fonts.png",
  );
  await page.screenshot({ path: out, fullPage: true });
  console.log(`Wrote ${out}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
