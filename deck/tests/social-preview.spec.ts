import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

test('the deployed site advertises the canonical absolute large-image OG and Twitter card without changing talk identity', async ({ page }) => {
  const response = await page.request.get('');
  expect(response.status()).toBe(200);
  const metadata = await page.evaluate((html) => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    return Object.fromEntries([...document.querySelectorAll('meta[property],meta[name]')]
      .map((meta) => [meta.getAttribute('property') ?? meta.getAttribute('name'), meta.getAttribute('content')]));
  }, await response.text());
  const image = 'https://ievangelist.github.io/inside-aspire/social/inside-aspire-og.png';
  expect(metadata['og:url']).toBe('https://ievangelist.github.io/inside-aspire/');
  expect(metadata['og:site_name']).toBe('Inside Aspire');
  expect(metadata['og:locale']).toBe('en_US');
  expect(metadata['og:title']).toBe('Inside Aspire: The Architecture Behind the AI Loop');
  expect(metadata['og:image']).toBe(image);
  expect(metadata['og:image:secure_url']).toBe(image);
  expect(metadata['og:image:type']).toBe('image/png');
  expect(metadata['og:image:width']).toBe('1200');
  expect(metadata['og:image:height']).toBe('630');
  expect(metadata['og:image:alt']).toContain('David Pine');
  expect(metadata['twitter:card']).toBe('summary_large_image');
  expect(metadata['twitter:image']).toBe(image);
  expect(metadata['twitter:image:alt']).toBe(metadata['og:image:alt']);
  expect(metadata['twitter:title']).toBe(metadata['og:title']);
  expect(metadata['twitter:description']).toBe(metadata['og:description']);
});

test('both original parent-produced portrait artworks have their declared PNG dimensions and verified hashes', async ({ request }) => {
  const proof = JSON.parse(readFileSync(resolve('..', 'docs', 'evidence', 'social-artwork.json'), 'utf8'));
  expect(proof.images).toHaveLength(2);
  for (const image of proof.images) {
    const file = readFileSync(resolve('public', 'social', image.file));
    expect(file.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(file.readUInt32BE(16)).toBe(image.width);
    expect(file.readUInt32BE(20)).toBe(image.height);
    expect(file.length).toBeLessThan(1_000_000);
    expect(createHash('sha256').update(file).digest('hex')).toBe(image.sha256);
    const response = await request.get(`social/${image.file}`);
    expect(response.status()).toBe(200);
    expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(image.sha256);
  }
  expect(proof.githubSocialPreview.automaticSettingChanged).toBe(false);
  expect(proof.githubSocialPreview.documentedSetup).toContain('Settings');
});
