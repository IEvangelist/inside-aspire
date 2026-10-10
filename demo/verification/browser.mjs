import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const options = Object.fromEntries(process.argv.slice(2).map((argument, index, args) =>
  argument.startsWith('--') ? [argument.slice(2), args[index + 1]] : []).filter((entry) => entry.length));
assert(options.api && options.frontend, 'Pass --api and --frontend URLs obtained from aspire describe.');
const live = options.live === 'true';
const edge = process.platform === 'win32'
  ? path.join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  : undefined;
const browser = await chromium.launch({
  headless: true,
  ...(edge && existsSync(edge) ? { executablePath: edge } : {}),
});
const proofs = [];
const output = fileURLToPath(new URL('../.artifacts/verification/', import.meta.url));
await mkdir(output, { recursive: true });
try {
  for (const [name, url] of [['native-artifact', options.api], ['vite-dev', options.frontend]]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const weather = page.waitForResponse((response) =>
      response.url().includes('/api/weather?') && response.status() === 200);
    const root = await page.goto(url, { waitUntil: 'domcontentloaded' });
    assert.equal(root.status(), 200);
    const initial = await (await weather).json();
    if (live) {
      assert(Number.isFinite(initial.current.temperatureC), 'The live provider returned no current temperature.');
    } else {
      assert.equal(initial.location.name, 'Fixture City');
    }
    await page.locator('.fc-row').first().waitFor();
    assert.equal(await page.locator('.fc-row').count(), 5);
    assert.equal(await page.locator('.hourly .hour').count(), 8);
    assert(await page.locator('.leaflet-container').isVisible());
    assert((await page.locator('.leaflet-control-attribution').innerText()).includes('OpenStreetMap'));
    const search = page.getByRole('combobox', { name: 'Search for a city' });
    await search.fill(live ? 'Madison' : 'Fixture');
    const selected = page.getByRole('option').nth(live ? 0 : 1);
    await selected.waitFor();
    const selection = page.waitForResponse((response) =>
      response.url().includes(live ? '/api/weather?' : '/api/weather?lat=48.0000') && response.status() === 200);
    await selected.click();
    const selectedWeather = await (await selection).json();
    if (live) {
      assert(Number.isFinite(selectedWeather.current.temperatureC));
      assert(selectedWeather.location.latitude > 42 && selectedWeather.location.latitude < 44,
        'The selected live result is not Madison, Wisconsin.');
      await page.waitForFunction(() => {
        const map = document.querySelector('.leaflet-container');
        if (!map) return false;
        const bounds = map.getBoundingClientRect();
        const covered = [...map.querySelectorAll('.leaflet-tile-loaded')].reduce((area, tile) => {
          if (!(tile instanceof HTMLImageElement) || tile.naturalWidth === 0 ||
              Number(getComputedStyle(tile).opacity) < 0.95) return area;
          const rect = tile.getBoundingClientRect();
          return area + Math.max(0, Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left)) *
            Math.max(0, Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top));
        }, 0);
        return bounds.width > 0 && covered >= bounds.width * bounds.height * 0.9;
      }, undefined, { timeout: 30_000 });
    } else {
      assert.equal(selectedWeather.location.latitude, 48);
    }
    assert.deepEqual(errors, []);
    proofs.push({ name, react: true, leaflet: true, forecastRows: 5, hourlyCells: 8, search: true, ...(live ? { mapTiles: true } : {}) });
    if (live) {
      for (const theme of ['dark', 'light']) {
        await page.emulateMedia({ colorScheme: theme });
        await page.screenshot({ path: path.join(output, `${name}-live-${theme}.png`), animations: 'disabled' });
      }
    } else {
      await page.screenshot({ path: path.join(output, `${name}.png`) });
    }
    await page.close();
  }
  const reference = await browser.newPage();
  const schemaResponse = reference.waitForResponse((response) =>
    new URL(response.url()).pathname === '/openapi.json' && response.status() === 200);
  const html = await reference.goto(new URL('/reference', options.api).href, { waitUntil: 'domcontentloaded' });
  assert.equal(html.status(), 200);
  const schema = await (await schemaResponse).json();
  assert.equal(schema.info.title, 'Aspire Weather Explorer API');
  await reference.waitForFunction(() => document.body.innerText.includes('Current conditions and 5-day forecast'),
    undefined, { timeout: 30000 });
  proofs.push({ name: 'native-scalar', document: true, rendered: true });
  await reference.screenshot({ path: path.join(output, 'native-scalar.png') });
  await reference.close();
  const result = { browser: 'Chromium', providerMode: live ? 'live-public-providers' : 'deterministic-fixtures', proofs };
  await writeFile(path.join(output, live ? 'browser-live-proof.json' : 'browser-proof.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
