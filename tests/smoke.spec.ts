import { expect, test } from '@playwright/test';

test('world boots, streams chunks, and stays inside budget contracts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Aeolian Wilds');
  await page.locator('#start-button').click();
  await page.waitForFunction(() => (window.__OPEN_WORLD_DEBUG__?.getSnapshot().chunks ?? 0) > 30);
  await page.waitForTimeout(3500);

  const snapshot = await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.getSnapshot());
  expect(snapshot).toBeTruthy();
  expect(snapshot!.started).toBe(true);
  expect(snapshot!.chunks).toBeGreaterThan(44);
  expect(snapshot!.queuedChunks).toBeLessThan(36);
  expect(snapshot!.trees + snapshot!.bushes).toBeGreaterThan(80);
  expect(snapshot!.environment.total).toBeGreaterThan(180);
  expect(
    snapshot!.environment.rocks +
      snapshot!.environment.waystones +
      snapshot!.environment.crystals +
      snapshot!.environment.ruins
  ).toBeGreaterThan(10);
  expect(snapshot!.environment.instanceMB).toBeLessThan(1);
  expect(snapshot!.environment.syncMs).toBeLessThan(12);
  expect(snapshot!.water.material).toBe('MeshPhongMaterial');
  expect(snapshot!.water.normalTextureMB).toBeGreaterThan(0.2);
  expect(snapshot!.weather.kind).toBeTruthy();
  expect(snapshot!.objective.total).toBe(3);
  expect(snapshot!.objective.complete).toBe(false);
  expect(snapshot!.settlements.towns).toBeGreaterThan(0);
  expect(snapshot!.settlements.buildings).toBeGreaterThan(0);
  expect(snapshot!.settlements.nearestTownDistance).toBeLessThan(180);
  expect(snapshot!.calls).toBeLessThan(180);
  expect(snapshot!.triangles).toBeLessThan(260_000);
  expect(snapshot!.renderScale).toBeGreaterThan(0.5);
  expect(snapshot!.renderScale).toBeLessThanOrEqual(0.65);
  expect(snapshot!.geometries).toBeLessThan(140);
  expect(snapshot!.textures).toBeLessThan(14);
  expect(snapshot!.terrainGeometryMB).toBeGreaterThan(3.5);
  expect(snapshot!.terrainGeometryMB).toBeLessThan(8);
  expect(snapshot!.chunkBuildMs).toBeLessThan(12);
  expect(snapshot!.fps).toBeGreaterThan(45);
  if (snapshot!.heapMB !== null) {
    expect(snapshot!.heapMB).toBeLessThan(100);
  }

  await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.setWeatherOverride('rain'));
  await page.waitForTimeout(700);
  const rainSnapshot = await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.getSnapshot());
  expect(rainSnapshot!.weather.kind).toBe('rain');
  expect(rainSnapshot!.weather.particles).toBeGreaterThan(500);

  const target = await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.getObjectiveTarget());
  await page.evaluate((next) => window.__OPEN_WORLD_DEBUG__?.setPlayerPosition(next!.x, next!.z), target);
  await page.waitForFunction(() => (window.__OPEN_WORLD_DEBUG__?.getSnapshot().objective.completed ?? 0) > 0);
  const objectiveSnapshot = await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.getSnapshot());
  expect(objectiveSnapshot!.objective.completed).toBeGreaterThan(0);

  const town = await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.getSettlementTarget());
  await page.evaluate((next) => window.__OPEN_WORLD_DEBUG__?.setPlayerPosition(next!.x, next!.z), town);
  await page.waitForFunction(() => window.__OPEN_WORLD_DEBUG__?.getSnapshot().settlements.active === true);

  for (let collected = 0; collected < 3; collected += 1) {
    const resource = await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.getContractTarget());
    await page.evaluate((next) => window.__OPEN_WORLD_DEBUG__?.setPlayerPosition(next!.x, next!.z), resource);
    await page.waitForFunction(
      (minimum) => (window.__OPEN_WORLD_DEBUG__?.getSnapshot().settlements.collected ?? 0) > minimum,
      collected
    );
  }

  await page.evaluate((next) => window.__OPEN_WORLD_DEBUG__?.setPlayerPosition(next!.x, next!.z), town);
  await page.waitForFunction(() => (window.__OPEN_WORLD_DEBUG__?.getSnapshot().settlements.completedContracts ?? 0) > 0);
  const contractSnapshot = await page.evaluate(() => window.__OPEN_WORLD_DEBUG__?.getSnapshot());
  expect(contractSnapshot!.settlements.completedContracts).toBeGreaterThan(0);
  expect(contractSnapshot!.heapMB === null || contractSnapshot!.heapMB < 100).toBe(true);
  expect(errors).toEqual([]);
});
