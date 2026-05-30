/**
 * Render the 3 design-direction mockups to PNG.
 * Inputs: mockups/{a-workshop,b-studio,c-console}.html
 * Outputs: test-artifacts/screenshots/2026-05-16-directions/{name}.png
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(".");
const VARIANTS = ["a-workshop", "b-studio", "c-console"] as const;
const OUT_DIR = "test-artifacts/screenshots/2026-05-16-directions";

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  for (const v of VARIANTS) {
    const page = await ctx.newPage();
    const url = pathToFileURL(resolve(ROOT, "mockups", `${v}.html`)).href;
    await page.goto(url, { waitUntil: "networkidle" });
    // Give Google Fonts a tick to apply.
    await page.waitForTimeout(800);
    const outPath = resolve(ROOT, OUT_DIR, `${v}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Wrote ${outPath}`);
    await page.close();
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
