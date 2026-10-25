import { expect, test, type Page } from '@playwright/test';

const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
const defaults = 'data-position="bottom-left" data-visible="true"';
const documentUrl = (url: URL) => url.pathname === '/inside-aspire/';
let configurationCase = 0;

async function configure(page: Page, attributes: string) {
  await page.unroute(documentUrl);
  await page.route(documentUrl, async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    if (!html.includes(defaults)) throw new Error('Expected the declarative default slide count configuration.');
    await route.fulfill({ response, body: html.replace(defaults, attributes) });
  });
}

async function ready(page: Page, query = '?mode=present') {
  const [search, hash] = query.split('#');
  // Reload the authored configuration instead of taking a same-document hash navigation.
  await page.goto(`${search}&badge-case=${++configurationCase}${hash ? `#${hash}` : ''}`);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
}

test('the default opaque bottom-left count is outside the toolbar and leaves Previous, Next and menu grouped', async ({ page }) => {
  await ready(page);
  const badge = page.locator('#slide-position');
  await expect(page.locator('.toolbar #slide-position')).toHaveCount(0);
  expect(await page.locator('.slide-navigation > *').evaluateAll((nodes) => nodes.map((node) => node.id)))
    .toEqual(['previous', 'next', 'menu-toggle']);
  await expect(badge).toHaveAttribute('data-position', 'bottom-left');
  await expect(badge).toHaveAttribute('data-visible', 'true');
  await expect(badge).toHaveAttribute('aria-live', 'polite');
  await expect(badge).toHaveAttribute('aria-atomic', 'true');
  await expect(badge).toHaveAttribute('aria-label', 'Slide 1 of 41');
  await expect(badge).toHaveText('1 / 41');
  const actual = await badge.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    const luminance = (values: number[]) => values.slice(0, 3)
      .map((value) => value / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const background = rgb(style.backgroundColor);
    const text = luminance(rgb(style.color));
    const surface = luminance(background);
    return {
      x: bounds.x, bottomGap: innerHeight - bounds.bottom, position: style.position,
      pointer: style.pointerEvents, alpha: background[3] ?? 1, opacity: style.opacity,
      contrast: (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05),
      border: parseFloat(style.borderTopWidth), shadow: style.boxShadow,
      font: style.fontFamily, numeric: style.fontVariantNumeric, animations: element.getAnimations().length,
    };
  });
  expect(actual.x).toBe(16);
  expect(actual.bottomGap).toBe(16);
  expect(actual.position).toBe('fixed');
  expect(actual.pointer).toBe('none');
  expect(actual.alpha).toBe(1);
  expect(actual.opacity).toBe('1');
  expect(actual.contrast).toBeGreaterThanOrEqual(4.5);
  expect(actual.border).toBe(1);
  expect(actual.shadow).not.toBe('none');
  expect(actual.font).toMatch(/^"Fira Code",/);
  expect(actual.numeric).toBe('tabular-nums');
  expect(actual.animations).toBe(0);
  const previous = (await page.locator('#previous').boundingBox())!;
  const next = (await page.locator('#next').boundingBox())!;
  const menu = (await page.locator('#menu-toggle').boundingBox())!;
  expect(next.x - previous.x - previous.width).toBeLessThanOrEqual(8);
  expect(next.x).toBeGreaterThanOrEqual(previous.x + previous.width);
  expect(menu.x).toBeGreaterThan(next.x + next.width);
  for (const box of [previous, next, menu]) {
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

for (const theme of ['light', 'dark'] as const) {
  test(`all four corners fit wide and narrow presentation/reading layouts in ${theme}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit four-corner/theme/mode/viewport matrix runs once.');
    test.setTimeout(90_000);
    for (const width of [1440, 1280, 390, 320]) {
      await page.setViewportSize({ width, height: width >= 1280 ? 900 : 844 });
      for (const mode of ['present', 'read'] as const) {
        for (const placement of positions) {
          await configure(page, `data-position="${placement}" data-visible="true"`);
          await ready(page, `?theme=${theme}&mode=${mode}#/lifecycle/1`);
          const badge = page.locator('#slide-position');
          await expect(badge).toHaveAttribute('data-position', placement);
          await expect(badge).toBeVisible();
          await expect(badge).toHaveText('27 / 41');
          const bounds = (await badge.boundingBox())!;
          const toolbar = (await page.locator('.toolbar').boundingBox())!;
          const height = width >= 1280 ? 900 : 844;
          expect(bounds.width).toBeGreaterThan(0);
          expect(bounds.height).toBeGreaterThan(0);
          expect(bounds.x).toBeGreaterThanOrEqual(0);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
          expect(bounds.y).toBeGreaterThanOrEqual(toolbar.y + toolbar.height);
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
          if (placement.endsWith('left')) expect(bounds.x).toBe(16);
          else expect(width - bounds.x - bounds.width).toBe(16);
          if (placement.startsWith('top')) expect(bounds.y).toBe(toolbar.y + toolbar.height + 12);
          else expect(height - bounds.y - bounds.height).toBe(16);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          if (placement === 'bottom-left' && mode === (width >= 1280 ? 'present' : 'read')) {
            const path = testInfo.outputPath(`badge-${width}-${theme}-${mode}.png`);
            await page.screenshot({ path });
            await testInfo.attach(`badge-${width}-${theme}-${mode}`, { path, contentType: 'image/png' });
          }
        }
      }
    }
  });
}

test('data-visible=false fully hides any valid position while the count remains correct internally', async ({ page }) => {
  for (const placement of positions) {
    await configure(page, `data-position="${placement}" data-visible="false"`);
    await ready(page, '?mode=present#/dashboard');
    const badge = page.locator('#slide-position');
    await expect(badge).toBeHidden();
    expect(await badge.boundingBox()).toBeNull();
    expect(await badge.evaluate((element) => element.hidden)).toBe(true);
    await expect(badge).toHaveText('29 / 41');
    await expect(badge).toHaveAttribute('aria-label', 'Slide 29 of 41');
  }
});

for (const [attributes, identity] of [
  ['data-position="center" data-visible="true"', 'data-position'],
  ['data-position="" data-visible="true"', 'data-position'],
  ['data-visible="true"', 'data-position'],
  ['data-position="bottom-left" data-visible="yes"', 'data-visible'],
  ['data-position="bottom-left" data-visible="False"', 'data-visible'],
  ['data-position="bottom-left"', 'data-visible'],
] as const) {
  test(`invalid slide count configuration ${attributes} fails explicitly`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'The exact declarative configuration failures run once.');
    await configure(page, attributes);
    await page.goto('');
    await expect(page.locator('#deck-status')).toContainText('#slide-position');
    await expect(page.locator('#deck-status')).toContainText(identity);
    await expect(page.locator('html')).not.toHaveAttribute('data-deck-ready', 'true');
  });
}

test('actual copy status stacks above only a visible bottom-left count without overlapping either badge or controls', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One exact status/visibility/position geometry matrix suffices.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [placement, visible] of [
      ['bottom-left', 'true'], ['bottom-left', 'false'], ['top-left', 'true'],
      ['top-right', 'true'], ['bottom-right', 'true'],
    ]) {
      await configure(page, `data-position="${placement}" data-visible="${visible}"`);
      await ready(page, `?mode=${width < 1000 ? 'read' : 'present'}#/lifecycle`);
      await expect(page.locator('#slide-position')).toHaveAttribute('data-position', placement);
      await expect(page.locator('#slide-position')).toHaveAttribute('data-visible', visible);
      await page.locator('#lifecycle .copy-code').click();
      const status = page.locator('#deck-status');
      await expect(status).toContainText('copied.');
      const box = (await status.boundingBox())!;
      if (placement === 'bottom-left' && visible === 'true') {
        const badge = (await page.locator('#slide-position').boundingBox())!;
        expect(box.y + box.height).toBeLessThan(badge.y);
        expect(badge.y - box.y - box.height).toBeGreaterThanOrEqual(8);
      } else expect(844 - box.y - box.height).toBe(8);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(56);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
  }
});

test('long actual clipboard errors remain readable and clear of every visible corner at 320px and 390px', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit real-error/narrow/corner matrix runs once.');
  await page.addInitScript(() => {
    navigator.clipboard.writeText = async () => { throw new Error('Deterministic copy-denied geometry fixture.'); };
  });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [placement, visible] of [
      ...positions.map((placement) => [placement, 'true']),
      ['bottom-right', 'false'],
    ]) {
      await configure(page, `data-position="${placement}" data-visible="${visible}"`);
      await ready(page, '?mode=read#/lifecycle');
      await page.locator('#lifecycle .copy-code').click();
      const status = page.locator('#deck-status');
      await expect(status).toHaveText(
        'Could not copy AppHost native executable wiring. Allow clipboard access, or select and copy the code directly.');
      const bounds = (await status.boundingBox())!;
      const badge = await page.locator('#slide-position').boundingBox();
      if (badge) {
        const overlap = bounds.x < badge.x + badge.width && bounds.x + bounds.width > badge.x &&
          bounds.y < badge.y + badge.height && bounds.y + bounds.height > badge.y;
        expect(overlap, `${width}px ${placement}: long error overlaps the badge`).toBe(false);
        if (placement === 'bottom-right') expect(bounds.x + bounds.width).toBeLessThanOrEqual(badge.x - 8);
      }
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(56);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
      expect(await status.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
      expect(await status.evaluate((node) => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1);
      await expect(status).toHaveCSS('font-size', '11px');
      if (placement !== 'bottom-right' || visible === 'false') await expect(status).toHaveCSS('max-inline-size', 'none');
    }
  }
});

for (const visible of ['true', 'false']) {
  test(`the ${visible === 'true' ? 'visible' : 'hidden'} badge's count and live label follow code steps, slide boundaries and browser history exactly`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'One exact code/history state trace per visibility suffices.');
    await configure(page, `data-position="bottom-left" data-visible="${visible}"`);
    await ready(page, '?mode=present#/parser');
    const badge = page.locator('#slide-position');
    for (const expected of [24, 24, 25]) {
      await page.locator('#next').click();
      await expect(badge).toHaveText(`${expected} / 41`);
      await expect(badge).toHaveAttribute('aria-label', `Slide ${expected} of 41`);
    }
    for (const hash of ['#/parser/1', '#/parser/0', '#/parser']) {
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${hash}$`));
      await expect(badge).toHaveText('24 / 41');
      await expect(badge).toHaveAttribute('aria-label', 'Slide 24 of 41');
    }
    await page.goForward();
    await expect(page).toHaveURL(/#\/parser\/0$/);
    await expect(badge).toHaveText('24 / 41');
    await page.evaluate(() => { location.hash = '/deployment'; });
    await expect(badge).toHaveText('33 / 41');
    await expect(badge).toHaveAttribute('aria-label', 'Slide 33 of 41');
  });
}

test('print and native speaker receivers hide the badge regardless of its enabled position', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'The exact print/receiver and native popup suppression matrix runs once.');
  for (const placement of positions) {
    await configure(page, `data-position="${placement}" data-visible="true"`);
    for (const query of ['?print-pdf', '?receiver&history=false&transition=none#/lifecycle/1']) {
      await ready(page, query);
      await expect(page.locator('#slide-position')).toBeHidden();
      expect(await page.locator('#slide-position').boundingBox()).toBeNull();
    }
  }
  await page.unroute(documentUrl);
  await ready(page, '?mode=present#/lifecycle/1');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#slide-position')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await expect(page.locator('#slide-position')).toBeVisible();
  await page.locator('#presentation').focus();
  const opened = page.waitForEvent('popup');
  await page.keyboard.press('s');
  const popup = await opened;
  try {
    for (const frame of ['#current-slide iframe', '#upcoming-slide iframe']) {
      const preview = popup.frameLocator(frame);
      await expect(preview.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      await expect(preview.locator('#slide-position')).toBeHidden();
    }
    await expect(page.locator('#slide-position')).toBeVisible();
  } finally {
    await popup.close();
  }
});

test.describe('static slide count fallback', () => {
  test.use({ javaScriptEnabled: false });
  test('the initial badge is useful without JavaScript and declarative hiding still works', async ({ page }) => {
    await page.goto('');
    await expect(page.locator('#slide-position')).toBeVisible();
    await expect(page.locator('#slide-position')).toHaveText('1 / 41');
    await expect(page.locator('.toolbar #slide-position')).toHaveCount(0);
    await configure(page, 'data-position="bottom-left" data-visible="false"');
    await page.goto('');
    await expect(page.locator('#slide-position')).toBeHidden();
  });
});
