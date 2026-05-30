import { resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(".");

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1080, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(
    "file://" + resolve(ROOT, "mockups", "fonts-plex-multirole.html"),
    { waitUntil: "networkidle" },
  );
  await page.waitForTimeout(2000); // all four font families need a beat
  const out = resolve(
    ROOT,
    "test-artifacts/screenshots/2026-05-17-refinements/fonts-plex-multirole.png",
  );
  await page.screenshot({ path: out, fullPage: true });
  console.log(`Wrote ${out}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
