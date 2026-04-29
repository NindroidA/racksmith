import { chromium } from "playwright";

const url = "http://localhost:3000/dev/phase-b-renderers";
const out = process.argv[2] ?? "/tmp/phase-b.png";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1700, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector("text=Phase B", { timeout: 10000 });
await page.screenshot({ path: out, fullPage: true, timeout: 60000 });
console.log("Saved:", out);
await browser.close();
