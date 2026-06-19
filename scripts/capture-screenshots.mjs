import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const url = process.env.OPEN_WORLD_URL ?? 'http://127.0.0.1:5173';
const outDir = path.resolve('artifacts/screenshots/v1.0.0');

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, '01-title.png'), fullPage: true });
  await page.locator('#start-button').click();
  await page.waitForFunction(() => window.__OPEN_WORLD_DEBUG__?.getSnapshot().chunks > 58);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(outDir, '02-world-debug.png'), fullPage: true });

  const dryTarget = await page.evaluate(() => {
    const debug = window.__OPEN_WORLD_DEBUG__;
    if (!debug) return { x: 0, z: 0 };
    let best = { x: 0, z: 0, score: -Infinity };
    for (let z = -1600; z <= 1600; z += 80) {
      for (let x = -1600; x <= 1600; x += 80) {
        const h = debug.sampleHeight(x, z);
        if (h < 12 || h > 95) continue;
        const distance = Math.hypot(x, z);
        const score = h * 0.02 - distance * 0.0002 + Math.sin(x * 12.989 + z * 78.233) * 0.15;
        if (score > best.score) best = { x, z, score };
      }
    }
    return { x: best.x, z: best.z };
  });
  await page.evaluate((target) => window.__OPEN_WORLD_DEBUG__?.setPlayerPosition(target.x, target.z), dryTarget);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(outDir, '03-streamed-biome.png'), fullPage: true });

  const metrics = await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.getSnapshot());
  console.log(JSON.stringify(metrics, null, 2));
} finally {
  await browser.close();
}
