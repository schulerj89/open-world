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
  expect(snapshot!.calls).toBeLessThan(160);
  expect(snapshot!.triangles).toBeLessThan(190_000);
  expect(snapshot!.renderScale).toBeGreaterThan(0.5);
  expect(snapshot!.renderScale).toBeLessThanOrEqual(0.65);
  expect(snapshot!.geometries).toBeLessThan(120);
  expect(snapshot!.textures).toBeLessThan(14);
  expect(snapshot!.terrainGeometryMB).toBeGreaterThan(2);
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
  expect(errors).toEqual([]);
});
