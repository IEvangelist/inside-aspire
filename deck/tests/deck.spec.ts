import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('loads local assets, actual slide content, and readable mobile text', async ({ page }, testInfo) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/inside-aspire/') && response.status() >= 400) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto('');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await expect(page.locator('#intro h1')).toHaveText('Inside Aspire');
  await expect(page.locator('section[id]')).toHaveCount(23);
  await expect(page.locator('#the-loop')).toContainText('Human review');
  await expect(page.locator('#timeout')).toContainText('ASPIRE_CLI_START_TIMEOUT');
  await expect(page.locator('#the-loop')).toContainText('next application/product change');
  await expect(page.locator('#api-index')).toContainText('Roslyn');
  await expect.poll(() => page.locator('.brand-link img').evaluateAll((images) =>
    images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
  if (testInfo.project.name === 'mobile') {
    await expect(page.locator('html')).toHaveAttribute('data-reading', 'true');
    await expect(page.getByRole('button', { name: 'Switch to presentation mode' })).toBeVisible();
    const title = await page.locator('#intro h1').boundingBox();
    expect(title?.height).toBeGreaterThan(42);
    const toolbar = await page.locator('.toolbar').boundingBox();
    expect(title?.y).toBeGreaterThanOrEqual((toolbar?.y ?? 0) + (toolbar?.height ?? 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(failures).toEqual([]);
});

test('deep links, chapter jumps, theme, reading mode, and keyboard navigation work', async ({ page }, testInfo) => {
  await page.goto('#/the-loop');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await expect(page.locator('#the-loop')).toBeVisible();
  await page.locator('#chapter').selectOption('skills');
  await expect(page).toHaveURL(/#\/skills$/);
  await expect(page.locator('#skills h2')).toBeInViewport();
  const previousTheme = await page.locator('html').getAttribute('data-theme');
  await page.locator('#theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', previousTheme === 'dark' ? 'light' : 'dark');
  if (testInfo.project.name !== 'mobile') {
    await page.locator('#presentation').click({ position: { x: 20, y: 20 } });
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/#\/skills-vs-tools$/);
    await page.keyboard.press('Escape');
    await expect(page.locator('.reveal')).toHaveClass(/overview/);
    await page.keyboard.press('Escape');
    await page.keyboard.press('r');
    await expect(page.locator('html')).toHaveAttribute('data-reading', 'true');
  }
  await expect(page.locator('#overview')).toBeDisabled();
  await page.locator('#read-mode').click();
  await expect(page.locator('html')).toHaveAttribute('data-reading', 'false');
  await expect(page.locator('#overview')).toBeEnabled();
});

test('keyboard focus and contrast pass the accessibility gate', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#presentation')).toBeFocused();
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test('reduced motion and printable view are supported', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const duration = await page.locator('#intro').evaluate((element) =>
    Math.max(...getComputedStyle(element).transitionDuration.split(',').map((value) => parseFloat(value))));
  expect(duration).toBeLessThanOrEqual(0.01);
  if (testInfo.project.name !== 'mobile') {
    await page.goto('?print-pdf');
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(page.locator('.pdf-page')).toHaveCount(23);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.toolbar')).toBeHidden();
  }
});

test('every desktop slide stays within the presentation viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Mobile uses natural scrolling instead of scaled slides.');
  await page.goto('');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const ids = await page.locator('.slides > section[id]').evaluateAll((slides) => slides.map((slide) => slide.id));
  for (const id of ids) {
    await page.evaluate((slideId) => { window.location.hash = `/${slideId}`; }, id);
    await expect(page.locator(`#${id}`)).toHaveClass(/present/);
    const overflow = await page.locator(`#${id}`).evaluate((slide) => {
      const elements = [...slide.querySelectorAll<HTMLElement>('h1,h2,h3,p,pre,figure,table,ol,.compiler-diagram,.skills-list,.contrast,.workflow-path')];
      return elements.filter((element) => {
        if (element.closest('.notes') || getComputedStyle(element).display === 'none') return false;
        const rect = element.getBoundingClientRect();
        return rect.bottom > window.innerHeight - 6 || rect.right > window.innerWidth + 2 || rect.left < -2;
      }).map((element) => `${element.tagName}: ${element.textContent?.trim().slice(0, 70)}`);
    });
    expect(overflow, `Slide ${id} overflowed`).toEqual([]);
  }
});
