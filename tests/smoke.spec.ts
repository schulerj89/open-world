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
  expect(snapshot!.calls).toBeLessThan(145);
  expect(snapshot!.triangles).toBeLessThan(150_000);
  expect(snapshot!.geometries).toBeLessThan(120);
  expect(snapshot!.textures).toBeLessThan(12);
  expect(snapshot!.terrainGeometryMB).toBeLessThan(8);
  expect(snapshot!.chunkBuildMs).toBeLessThan(12);
  expect(snapshot!.fps).toBeGreaterThan(45);
  if (snapshot!.heapMB !== null) {
    expect(snapshot!.heapMB).toBeLessThan(100);
  }
  expect(errors).toEqual([]);
});
