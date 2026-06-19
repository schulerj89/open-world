import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const version = packageJson.version;
const url = process.env.OPEN_WORLD_URL ?? 'http://127.0.0.1:5176';
const outDir = path.resolve(`artifacts/screenshots/v${version}`);

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, '01-title.png'), fullPage: true });
  await page.locator('#start-button').click();
  await page.waitForFunction(() => (window.__OPEN_WORLD_DEBUG__?.getSnapshot().chunks ?? 0) > 44);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(outDir, '02-world-debug.png'), fullPage: true });

  const settlementTarget = await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.getSettlementTarget());
  await page.evaluate((target) => window.__OPEN_WORLD_DEBUG__?.setPlayerPosition(target.x, target.z), settlementTarget);
  await page.waitForFunction(() => (window.__OPEN_WORLD_DEBUG__?.getSnapshot().settlements.active ?? false) === true);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, '03-settlement-arrival.png'), fullPage: true });

  const firstResource = await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.getContractTarget());
  await page.evaluate(
    (target) => window.__OPEN_WORLD_DEBUG__?.setPlayerPosition(target.x + 13, target.z + 6),
    firstResource
  );
  await page.waitForFunction(() => (window.__OPEN_WORLD_DEBUG__?.getSnapshot().queuedChunks ?? 1) === 0);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '04-contract-target.png'), fullPage: true });

  for (let collected = 0; collected < 3; collected += 1) {
    const resource = await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.getContractTarget());
    await page.evaluate((target) => window.__OPEN_WORLD_DEBUG__?.setPlayerPosition(target.x, target.z), resource);
    await page.waitForFunction(
      (minimum) => (window.__OPEN_WORLD_DEBUG__?.getSnapshot().settlements.collected ?? 0) > minimum,
      collected
    );
  }
  await page.evaluate((target) => window.__OPEN_WORLD_DEBUG__?.setPlayerPosition(target.x, target.z), settlementTarget);
  await page.waitForFunction(() => (window.__OPEN_WORLD_DEBUG__?.getSnapshot().settlements.completedContracts ?? 0) > 0);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '05-settlement-complete.png'), fullPage: true });

  await moveToBest(page, 'grassland');
  await page.screenshot({ path: path.join(outDir, '06-streamed-biome.png'), fullPage: true });

  await moveToBest(page, 'shore');
  await page.screenshot({ path: path.join(outDir, '07-shoreline-detail.png'), fullPage: true });

  await moveToBest(page, 'forest');
  await page.screenshot({ path: path.join(outDir, '08-forest-detail.png'), fullPage: true });

  await moveToBest(page, 'rock');
  await page.screenshot({ path: path.join(outDir, '09-rocky-slope-detail.png'), fullPage: true });

  await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.setWeatherOverride('rain'));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '10-rain-weather.png'), fullPage: true });

  await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.setWeatherOverride('snow'));
  await moveToBest(page, 'snow');
  await page.screenshot({ path: path.join(outDir, '11-snow-weather.png'), fullPage: true });

  await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.setWeatherOverride('clear'));
  const objectiveTarget = await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.getObjectiveTarget());
  await page.evaluate((target) => window.__OPEN_WORLD_DEBUG__?.setPlayerPosition(target.x, target.z), objectiveTarget);
  await page.waitForFunction(() => (window.__OPEN_WORLD_DEBUG__?.getSnapshot().objective.completed ?? 0) > 0);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '12-objective-beacon.png'), fullPage: true });

  await page.waitForTimeout(4500);
  const metrics = await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.getSnapshot());
  console.log(JSON.stringify(metrics, null, 2));
} finally {
  await browser.close();
}

async function moveToBest(page, desiredBiome) {
  const target = await page.evaluate((biome) => {
    const debug = window.__OPEN_WORLD_DEBUG__;
    if (!debug) return { x: 0, z: 0 };
    let best = { x: 0, z: 0, score: -Infinity };
    for (let z = -4800; z <= 4800; z += 120) {
      for (let x = -4800; x <= 4800; x += 120) {
        const sample = debug.sampleWorld(x, z);
        if (sample.height < -4 || sample.height > (biome === 'snow' ? 220 : 150)) continue;
        const biomeScore = sample.biome === biome ? 4 : relatedBiomeScore(sample.biome, biome, sample.height);
        if (biomeScore <= 0) continue;
        const distance = Math.hypot(x, z);
        const heightScore = biome === 'shore' ? -Math.abs(sample.height - 4) * 0.08 : sample.height * 0.01;
        const score =
          biomeScore +
          heightScore +
          sample.moisture * (biome === 'forest' ? 1.2 : 0.25) -
          distance * 0.00016 +
          Math.sin(x * 12.989 + z * 78.233) * 0.12;
        if (score > best.score) best = { x, z, score };
      }
    }
    if (best.score === -Infinity) {
      for (let z = -4800; z <= 4800; z += 120) {
        for (let x = -4800; x <= 4800; x += 120) {
          const sample = debug.sampleWorld(x, z);
          if (sample.height < 6 || sample.height > (biome === 'snow' ? 220 : 150)) continue;
          const score = sample.height - Math.hypot(x, z) * 0.002;
          if (score > best.score) best = { x, z, score };
        }
      }
    }
    return { x: best.x, z: best.z };

    function relatedBiomeScore(actual, wanted, height) {
      if (wanted === 'rock' && actual === 'snow') return 2.2;
      if (wanted === 'rock' && height > 82) return 1.8;
      if (wanted === 'grassland' && actual === 'forest') return 2;
      if (wanted === 'shore' && actual === 'shallow-water') return 1.6;
      return 0;
    }
  }, desiredBiome);
  await page.evaluate((next) => window.__OPEN_WORLD_DEBUG__?.setPlayerPosition(next.x, next.z), target);
  await page.waitForFunction(() => (window.__OPEN_WORLD_DEBUG__?.getSnapshot().queuedChunks ?? 1) === 0);
  await page.waitForTimeout(1700);
}
