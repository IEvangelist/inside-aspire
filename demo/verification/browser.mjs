import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const options = Object.fromEntries(process.argv.slice(2).map((argument, index, args) =>
  argument.startsWith('--') ? [argument.slice(2), args[index + 1]] : []).filter((entry) => entry.length));
assert(options.api && options.frontend, 'Pass --api and --frontend URLs obtained from aspire describe.');
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
    assert.equal(initial.location.name, 'Fixture City');
    await page.locator('.fc-row').first().waitFor();
    assert.equal(await page.locator('.fc-row').count(), 5);
    assert.equal(await page.locator('.hourly .hour').count(), 8);
    assert(await page.locator('.leaflet-container').isVisible());
    assert((await page.locator('.leaflet-control-attribution').innerText()).includes('OpenStreetMap'));
    const search = page.getByRole('combobox', { name: 'Search for a city' });
    await search.fill('Fixture');
    await page.getByRole('option').nth(1).waitFor();
    const selection = page.waitForResponse((response) =>
      response.url().includes('/api/weather?lat=48.0000') && response.status() === 200);
    await page.getByRole('option').nth(1).click();
    assert.equal((await (await selection).json()).location.latitude, 48);
    assert.deepEqual(errors, []);
    proofs.push({ name, react: true, leaflet: true, forecastRows: 5, hourlyCells: 8, search: true });
    await page.screenshot({ path: path.join(output, `${name}.png`) });
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
  const result = { browser: 'Chromium', providerMode: 'deterministic-fixtures', proofs };
  await writeFile(path.join(output, 'browser-proof.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
