import { expect, test } from '@playwright/test';

for (const width of [320, 390, 1440]) {
  test(`only the requested current social profiles fit under the portrait at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit social viewport matrix runs once.');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('');
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    const links = page.locator('.speaker-socials a');
    await expect(links).toHaveCount(4);
    const expected = [
      ['github', 'https://github.com/IEvangelist', 'GitHub', 'github.com/IEvangelist'],
      ['x', 'https://x.com/davidpine7', 'X', 'x.com/davidpine7'],
      ['bluesky', 'https://bsky.app/profile/davidpine.dev', 'Bluesky', 'bsky.app/profile/davidpine.dev'],
      ['linkedin', 'https://www.linkedin.com/in/dpine/', 'LinkedIn', 'www.linkedin.com/in/dpine'],
    ];
    const portrait = await page.locator('.speaker-portrait').boundingBox();
    let previousBottom = 0;
    let iconLeft: number | undefined;
    for (const [name, url, title, display] of expected) {
      const link = page.locator(`[data-social="${name}"]`);
      await expect(link).toHaveAttribute('href', url);
      await expect(link.locator('.social-url')).toHaveText(display);
      await expect(link).toHaveAccessibleName(display);
      await expect(link).toHaveAttribute('title', title);
      await expect(link).toHaveAttribute('rel', /noopener/);
      await expect(link).toBeVisible();
      const bounds = await link.boundingBox();
      const icon = await link.locator('.social-icon').boundingBox();
      const text = await link.locator('.social-url').boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(43.9);
      expect(bounds!.height).toBeGreaterThanOrEqual(43.9);
      expect(bounds!.y).toBeGreaterThanOrEqual(portrait!.y + portrait!.height);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.y).toBeGreaterThanOrEqual(previousBottom);
      if (iconLeft !== undefined) expect(icon!.x).toBeCloseTo(iconLeft, 1);
      expect(text!.x).toBeGreaterThanOrEqual(icon!.x + icon!.width);
      previousBottom = bounds!.y + bounds!.height;
      iconLeft = icon!.x;
      await link.focus();
      await expect(link).toBeFocused();
    }
    await expect(page.locator('[data-social="x"] .icon-socialX path')).toHaveCount(1);
    await expect(page.locator('[data-social="bluesky"] .icon-socialBluesky path')).toHaveCount(1);
    await expect(page.locator('[data-social="linkedin"] .icon-socialLinkedIn path')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
