import { expect, test } from '@playwright/test';

test('the site advertises an absolute large-image OG and Twitter card that actually loads', async ({ page }) => {
  const response = await page.request.get('');
  expect(response.status()).toBe(200);
  const metadata = await page.evaluate((html) => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    return Object.fromEntries([...document.querySelectorAll('meta[property],meta[name]')]
      .map((meta) => [meta.getAttribute('property') ?? meta.getAttribute('name'), meta.getAttribute('content')]));
  }, await response.text());
  for (const key of ['og:url', 'og:title', 'og:description', 'og:image', 'og:image:alt']) expect(metadata[key]).toBeTruthy();
  expect(metadata['og:image']).toMatch(/^https:\/\//);
  expect(metadata['twitter:card']).toBe('summary_large_image');
  expect(metadata['twitter:image']).toBe(metadata['og:image']);
  expect(metadata['twitter:image:alt']).toBe(metadata['og:image:alt']);
  expect(metadata['twitter:title']).toBe(metadata['og:title']);
  expect(metadata['twitter:description']).toBe(metadata['og:description']);
  const local = await page.request.get(new URL(metadata['og:image']!).pathname.replace(/^\/inside-aspire\//, ''));
  expect(local.status()).toBe(200);
  expect((await local.body()).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
});
