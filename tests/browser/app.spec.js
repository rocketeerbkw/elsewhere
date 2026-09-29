import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.beforeEach(async ({ page }) => {
  // No external service traffic for repeatable UI tests.
  await page.route(/^https:\/\/(tile\.openstreetmap\.org|server\.arcgisonline\.com)\//, route => route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOioAAAAASUVORK5CYII=', 'base64') }));
});
test('example, rotation, drag, continent presets, and share restore', async ({ page, context }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.locator('#distance')).not.toHaveText('—');
  await expect(page.locator('.stop-row')).toHaveCount(4);
  const path = page.locator('.route-path');
  const before = await path.getAttribute('d');
  await page.locator('#rotation').fill('70');
  await expect(page.locator('#angle')).toHaveText('70°');
  expect(await path.getAttribute('d')).not.toBe(before);
  await page.getByRole('button', { name: 'Asia', exact: true }).click();
  await expect(page.locator('#angle')).toHaveText('0°');
  await page.getByRole('button', { name: 'Europe', exact: true }).click();
  const point = await path.evaluate(el => { const p=el.getPointAtLength(el.getTotalLength()*.5); const transformed = new DOMPoint(p.x,p.y).matrixTransform(el.getScreenCTM()); return {x:transformed.x,y:transformed.y}; });
  await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x+50,point.y+35,{steps:8}); await page.mouse.up();
  await expect(page.locator('#map-title')).toContainText('Somewhere else');
  await page.getByRole('button', { name: 'Copy share link' }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('#trip=');
  const data = JSON.parse(new URLSearchParams(new URL(link).hash.slice(1)).get('trip'));
  expect(data.anchor).not.toEqual([49,13]);
  await page.goto(link);
  await expect(page.locator('#status')).toHaveText('Shared example loaded.');
  await expect(page.locator('#map-title')).toContainText('Somewhere else');
  expect(errors).toEqual([]);
});
test('routes entered stops and keeps the last route after service failure', async ({ page }) => {
  let count = 0;
  await page.route('https://nominatim.openstreetmap.org/**', route => {
    count++;
    return route.fulfill({ json: [{ lat: count === 1 ? '41.8781' : '40.7128', lon: count === 1 ? '-87.6298' : '-74.006', display_name: count === 1 ? 'Chicago, Illinois' : 'New York, New York' }] });
  });
  await page.route('https://router.project-osrm.org/**', route => route.fulfill({ json: { code: 'Ok', routes: [{ distance: 1250000, duration: 45000, geometry: { coordinates: [[-87.6298,41.8781],[-83,42],[-74.006,40.7128]] } }] } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Remove stop 1' }).click();
  await page.getByRole('button', { name: 'Remove stop 1' }).click();
  await page.getByRole('textbox', { name: 'Starting point' }).fill('Chicago, IL');
  await page.getByRole('textbox', { name: 'Destination' }).fill('New York, NY');
  await page.getByRole('button', { name: 'Map my trip' }).click();
  await expect(page.locator('#status')).toContainText('Ready.');
  await expect(page.locator('#distance')).toHaveText('777');
  const path = await page.locator('.route-path').getAttribute('d');
  await page.route('https://router.project-osrm.org/**', route => route.fulfill({ json: { code: 'NoRoute', routes: [] } }));
  await page.getByRole('button', { name: 'Map my trip' }).click();
  await expect(page.locator('#status')).toContainText('No driving route');
  expect(await page.locator('.route-path').getAttribute('d')).toBe(path);
  expect(count).toBe(2); // Repeated submission uses cached geocoding.
});
test('exports and imports exact trip, rejecting malformed input', async ({ page }) => {
  await page.goto('/');
  await page.locator('#rotation').fill('-55');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save trip file' }).click();
  const download = await downloadPromise;
  const file = await download.path();
  await page.locator('#rotation').fill('20');
  await page.locator('#import').setInputFiles(file);
  await expect(page.locator('#angle')).toHaveText('-55°');
  await expect(page.locator('#status')).toHaveText('Saved trip opened.');
  const secondDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save trip file' }).click();
  const secondFile = await (await secondDownload).path();
  expect(JSON.parse(readFileSync(secondFile, 'utf8'))).toEqual(JSON.parse(readFileSync(file, 'utf8')));
  await page.locator('#import').setInputFiles({ name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken') });
  await expect(page.locator('#status')).toContainText('not valid JSON');
  await expect(page.locator('#angle')).toHaveText('-55°');
});
test('mobile layout is usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button', { name: 'Europe', exact:true }).scrollIntoViewIfNeeded();
  await expect(page.locator('#rotation')).toBeVisible();
  await page.locator('#rotation').fill('95');
  await expect(page.locator('#angle')).toHaveText('95°');
  await page.getByRole('button', { name: 'How it works' }).click();
  await expect(page.locator('#about')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#about')).not.toBeVisible();
});
