import { expect, test } from '@playwright/test';

test('dashboard screenshots load the theme-matched image at its full aspect in both themes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One theme/desktop/mobile image matrix suffices.');
  for (const theme of ['dark', 'light']) {
    for (const viewport of [{ width: 1280, height: 720, mode: 'present' }, { width: 390, height: 844, mode: 'read' }]) {
      await page.setViewportSize(viewport);
      await page.goto(`?theme=${theme}&mode=${viewport.mode}#/dashboard-integrated`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      await page.evaluate(() => document.fonts.ready);
      const actual = page.locator('#dashboard-integrated .dashboard-image img:visible');
      await expect(actual).toHaveCount(1);
      await expect(actual).toHaveAttribute('src', new RegExp(`-${theme}\\.[a-z]+$`));
      await actual.evaluate((element) => { (element as HTMLImageElement).loading = 'eager'; });
      await expect.poll(() => actual.evaluate((element) =>
        element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
      const geometry = await actual.evaluate((element) => {
        const image = element as HTMLImageElement;
        const bounds = image.getBoundingClientRect();
        return { width: image.clientWidth, height: image.clientHeight, right: bounds.right,
          naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
      });
      expect(Math.abs(geometry.width / geometry.height - geometry.naturalWidth / geometry.naturalHeight)).toBeLessThan(0.02);
      expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
    }
  }
});

test('dashboard and deployment code copies exactly what is displayed', async ({ page }) => {
  await page.goto('?mode=present#/dashboard-standalone');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const ids = await page.locator('.slides > section[id^="dashboard"], .slides > section[id^="deployment"]')
    .evaluateAll((slides) => slides.map((slide) => slide.id));
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) {
    for (const code of await page.locator(`#${id} pre code`).all()) {
      const text = await code.textContent();
      const copied = await code.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.toString();
      });
      expect(copied).toBe(text);
    }
  }
});
