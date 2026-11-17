import { expect, test } from '@playwright/test';

for (const width of [320, 390, 1440]) {
  test(`social profile links are reachable, labelled and fit under the portrait at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit social viewport matrix runs once.');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('');
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    const links = await page.locator('.speaker-socials a').all();
    expect(links.length).toBeGreaterThan(0);
    const portrait = await page.locator('.speaker-portrait').boundingBox();
    let previousBottom = 0;
    for (const link of links) {
      await expect(link).toHaveAttribute('href', /^https:\/\//);
      await expect(link).toHaveAttribute('rel', /noopener/);
      await expect(link).toBeVisible();
      expect((await link.evaluate((node) => node.textContent ?? '')).trim().length).toBeGreaterThan(0);
      const bounds = await link.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(43.9);
      expect(bounds!.height).toBeGreaterThanOrEqual(43.9);
      expect(bounds!.y).toBeGreaterThanOrEqual(portrait!.y + portrait!.height);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.y).toBeGreaterThanOrEqual(previousBottom);
      previousBottom = bounds!.y + bounds!.height;
      await link.focus();
      await expect(link).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
