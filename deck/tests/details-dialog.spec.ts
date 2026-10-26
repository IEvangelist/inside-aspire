import { chromium, expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function ready(page: Page, mode = 'present', width = 1280, theme = 'dark', height = width >= 1000 ? 720 : 844) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`?mode=${mode}&theme=${theme}#/history`);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
}

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().toJSON();
    const current = document.querySelector<HTMLElement>('.slides section.present')!;
    return {
      url: location.href, reading: document.documentElement.dataset.reading,
      index: [...document.querySelectorAll('.slides > section[id]')].indexOf(current),
      fragment: current.dataset.fragment ?? '-1', overview: document.querySelector('.reveal')!.classList.contains('overview'),
      detailsOpen: document.querySelector<HTMLDetailsElement>('#history details')!.open,
      slide: box('#history'), stage: box('.slides'), viewport: box('#slide-viewport'), root: box('#presentation'),
      toolbar: box('.toolbar'), counter: box('#slide-position'), status: box('#deck-status'),
      ancestors: [document.documentElement, document.body, ...document.querySelectorAll<HTMLElement>(
        '#presentation, #slide-viewport, .slides, #history, #history details',
      )].map((element) => [element.scrollLeft, element.scrollTop]),
    };
  });
}

test('opening the history references preserves presentation URL, mode, exact stage geometry and all outer scroll positions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Exact reported presentation reflow regression runs once.');
  await ready(page);
  const before = await snapshot(page);
  await page.locator('#history summary').click();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const after = await snapshot(page);
  await testInfo.attach('history-disclosure-state', { body: JSON.stringify({ before, after }, null, 2), contentType: 'application/json' });
  expect(after.url).toBe(before.url);
  expect(after.reading).toBe('false');
  expect(after).toEqual(before);
  await expect(page.locator('#slide-details')).toBeVisible();
  await expect(page.locator('#history details')).not.toHaveAttribute('open', '');
});

test('pointer, Enter and Space repeatedly open one modal without toggling details or changing the deck; Close and Escape restore focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One exact repeated activation/state matrix suffices.');
  await ready(page);
  const before = await snapshot(page);
  const summary = page.locator('#history summary');
  for (const activation of ['pointer', 'Enter', ' '] as const) {
    for (let repeat = 0; repeat < 2; repeat++) {
      if (activation === 'pointer') await summary.click();
      else { await summary.focus(); await page.keyboard.press(activation); }
      await expect(page.locator('#slide-details')).toBeVisible();
      await expect(summary).toHaveAttribute('aria-haspopup', 'dialog');
      await expect(summary).toHaveAttribute('aria-expanded', 'true');
      expect(await snapshot(page)).toEqual(before);
      if (repeat === 0) await page.getByRole('button', { name: 'Close', exact: true }).click();
      else await page.keyboard.press('Escape');
      await expect(page.locator('#slide-details')).toBeHidden();
      await expect(summary).toBeFocused();
      await expect(summary).toHaveAttribute('aria-expanded', 'false');
      expect(await snapshot(page)).toEqual(before);
      await expect(page.locator('#history #go-apphost-code')).toHaveCount(1);
    }
  }
  await expect(page.locator('#slide-details')).toHaveCount(1);
  await page.locator('#next').click();
  await expect(page.locator('.slides section.present')).toHaveAttribute('id', 'historical-evidence');
  await page.locator('#previous').click();
  await expect(page.locator('.slides section.present')).toHaveAttribute('id', 'history');
  await expect(summary).toBeVisible();
  await expect(page.locator('#history details')).not.toHaveAttribute('open', '');
});

test('real page scrollbar gutters and background scroll lock preserve exact 783px, 390px and 320px stage rectangles', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Real visible-scrollbar Chromium, not the default hidden-scrollbar shell.');
  const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  try {
    for (const width of [783, 390, 320]) {
      const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
      try {
        const page = await context.newPage();
        await ready(page, 'present', width, 'dark', width === 783 ? 800 : 844);
        await page.evaluate(() => {
          const spacer = document.createElement('div');
          spacer.style.height = '80px';
          document.body.append(spacer);
          window.scrollTo(0, 20);
        });
        // clientWidth includes the reserved gutter when root overflow is hidden; the body's painted width does not.
        const gutter = await page.evaluate(() => innerWidth - document.body.getBoundingClientRect().width);
        expect(gutter).toBeGreaterThan(0);
        await page.locator('#deck-status').evaluate((element) => { element.textContent = 'Presentation mode. Use arrow keys to navigate.'; });
        for (const position of ['bottom-left', 'bottom-right', 'top-left', 'top-right']) {
          await page.locator('#slide-position').evaluate((element, position) => { element.dataset.position = position; }, position);
          const before = await snapshot(page);
          expect(before.ancestors[0][1]).toBe(20);
          await page.locator('#history summary').click();
          await expect(page.locator('#slide-details')).toBeVisible();
          expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).toBe('hidden');
          expect(await page.evaluate(() => innerWidth - document.body.getBoundingClientRect().width)).toBe(gutter);
          expect(await snapshot(page)).toEqual(before);
          await page.locator('#slide-details .details-scroll').focus();
          await page.keyboard.press('End');
          expect(await snapshot(page)).toEqual(before);
          await page.keyboard.press('Escape');
          await expect(page.locator('#history summary')).toBeFocused();
          expect(await page.evaluate(() => innerWidth - document.body.getBoundingClientRect().width)).toBe(gutter);
          expect(await snapshot(page)).toEqual(before);
        }
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
});

for (const theme of ['light', 'dark'] as const) {
  test(`actual nodes, copy listeners, independent scroll, links and fixed chrome remain intact across all ${theme} viewports`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit five-width/theme modal geometry matrix runs once.');
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: async (text: string) => { document.documentElement.dataset.detailsCopied = text; },
      } });
    });
    for (const width of [1440, 1280, 617, 390, 320]) {
      await ready(page, 'present', width, theme);
      const before = await snapshot(page);
      const nodes = await page.locator('#history details').evaluateHandle((details) => {
        const nodes = [...details.querySelectorAll<HTMLElement>('code, button')];
        for (const button of details.querySelectorAll<HTMLButtonElement>('button')) {
          if (button.dataset.calls !== undefined) continue;
          button.dataset.calls = '0';
          button.addEventListener('click', () => { button.dataset.calls = String(Number(button.dataset.calls) + 1); });
        }
        return nodes;
      });
      const source = await page.locator('#go-apphost-code').textContent();
      await page.locator('#history summary').click();
      const dialog = page.locator('#slide-details');
      const scroller = dialog.locator('.details-scroll');
      await expect(dialog).toBeVisible();
      expect(await nodes.evaluate((nodes) => nodes.every((node) => node.isConnected && !!node.closest('#slide-details')))).toBe(true);
      await expect(page.locator('pre code')).toHaveCount(32);
      await expect(page.locator('pre code:not([data-illustrative-addition] pre code)')).toHaveCount(30);
      const geometry = await dialog.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const body = element.querySelector<HTMLElement>('.details-scroll')!;
        const button = element.querySelector('[data-close-details]')!.getBoundingClientRect();
        const badge = document.querySelector('#slide-position')!.getBoundingClientRect();
        const toolbar = document.querySelector('.toolbar')!.getBoundingClientRect();
        return { box: box.toJSON(), button: button.toJSON(), badge: badge.toJSON(), toolbarBottom: toolbar.bottom,
          overflow: body.scrollHeight - body.clientHeight, horizontal: body.scrollWidth - body.clientWidth,
          rootOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          croppedCode: [...element.querySelectorAll<HTMLElement>('pre')].filter((pre) =>
            pre.scrollWidth > pre.clientWidth + 1 || pre.scrollHeight > pre.clientHeight + 1).length };
      });
      expect(geometry.box.left).toBeGreaterThanOrEqual(0);
      expect(geometry.box.right).toBeLessThanOrEqual(width);
      expect(geometry.box.top).toBeGreaterThanOrEqual(geometry.toolbarBottom + 12);
      expect(geometry.box.bottom).toBeLessThanOrEqual(geometry.badge.top - 12);
      expect(geometry.button.width).toBeGreaterThanOrEqual(44);
      expect(geometry.button.height).toBeGreaterThanOrEqual(44);
      expect(geometry.overflow).toBeGreaterThan(0);
      expect(geometry.horizontal).toBeLessThanOrEqual(1);
      expect(geometry.rootOverflow).toBe(false);
      expect(geometry.croppedCode).toBe(0);
      const anchors = [await dialog.locator('.menu-heading').boundingBox(), await dialog.locator('[data-close-details]').boundingBox()];
      await scroller.focus();
      await page.keyboard.press('End');
      await expect.poll(() => scroller.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThanOrEqual(1);
      await expect(dialog.locator('.source-line a').last()).toBeInViewport();
      expect([await dialog.locator('.menu-heading').boundingBox(), await dialog.locator('[data-close-details]').boundingBox()]).toEqual(anchors);
      expect(await snapshot(page)).toEqual(before);
      const copy = dialog.getByRole('button', { name: 'Copy Illustrative C# AppHost for a Go service', exact: true });
      const calls = Number(await copy.getAttribute('data-calls'));
      await copy.click();
      await expect(page.locator('html')).toHaveAttribute('data-details-copied', source ?? '');
      await expect(copy).toHaveAttribute('data-calls', String(calls + 1));
      await expect(dialog.locator('[role="status"]')).toContainText('copied.');
      expect(await snapshot(page)).toEqual(before);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      expect(await nodes.evaluate((nodes) => nodes.every((node) => node.isConnected && !!node.closest('#history details')))).toBe(true);
      await nodes.dispose();
      expect(await snapshot(page)).toEqual(before);
    }
  });
}

test('native modal focus stays trapped and presentation shortcuts cannot navigate, change mode, theme or open Notes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Native focus and keyboard blocking are viewport independent.');
  await ready(page);
  const before = await snapshot(page);
  await page.locator('#history summary').click();
  for (let count = 0; count < 16; count++) {
    await page.keyboard.press(count % 3 === 0 ? 'Shift+Tab' : 'Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#slide-details'))).toBe(true);
  }
  await page.locator('#slide-details .details-scroll').focus();
  for (const key of ['ArrowRight', 'ArrowLeft', 'PageDown', 'r', 't', 's', 'Home', 'End']) {
    await page.keyboard.press(key);
    expect(await snapshot(page)).toEqual(before);
    await expect(page.locator('#slide-details')).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#history summary')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.slides section.present')).toHaveAttribute('id', 'historical-evidence');
});

test('slide, overview, explicit mode changes and page teardown close and restore original content deterministically', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One forced-lifecycle restoration path suffices.');
  await ready(page);
  for (const method of ['slide', 'toggleOverview'] as const) {
    await page.locator('#history summary').click();
    await page.evaluate((method) => {
      window.postMessage(JSON.stringify({ method, args: method === 'slide' ? [39] : [true] }), location.origin);
    }, method);
    await expect(page.locator('#slide-details')).toBeHidden();
    await expect(page.locator('#history #go-apphost-code')).toHaveCount(1);
    await ready(page);
  }
  await page.locator('#history summary').click();
  await page.locator('#read-mode').evaluate((element) => element.click());
  await expect(page.locator('html')).toHaveAttribute('data-reading', 'true');
  await expect(page.locator('#slide-details')).toBeHidden();
  await expect(page.locator('#history #go-service-code')).toBeVisible();
  await page.locator('#history summary').click();
  await expect(page.locator('#history details')).not.toHaveAttribute('open', '');
  await page.setViewportSize({ width: 617, height: 844 });
  await expect(page.locator('#history details')).not.toHaveAttribute('open', '');
  await page.locator('#history summary').click();
  await expect(page.locator('#history details')).toHaveAttribute('open', '');
  await page.locator('#read-mode').evaluate((element) => element.click());
  await expect(page.locator('html')).toHaveAttribute('data-reading', 'false');
  await expect(page.locator('#history details')).not.toHaveAttribute('open', '');
  await page.locator('#history summary').click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await expect(page.locator('#slide-details')).toBeHidden();
  await expect(page.locator('#history #go-apphost-code')).toHaveCount(1);
  await page.locator('#history summary').click();
  await expect(page.locator('#slide-details')).toBeVisible();
});

test('reading disclosures stay native, print restores all original code, and no-JavaScript remains native', async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit reading/actual print-media/query/no-JavaScript matrix runs once.');
  await ready(page, 'read', 390);
  const details = page.locator('#history details');
  await expect(details).toHaveAttribute('open', '');
  await expect(page.locator('#history summary')).not.toHaveAttribute('aria-haspopup', 'dialog');
  await page.locator('#history summary').click();
  await expect(details).not.toHaveAttribute('open', '');
  await expect(page.locator('#slide-details')).toBeHidden();
  await page.locator('#history summary').focus();
  await page.keyboard.press(' ');
  await expect(details).toHaveAttribute('open', '');
  await expect(page.locator('html')).toHaveAttribute('data-reading', 'true');
  await ready(page);
  const before = await snapshot(page);
  await page.locator('#history summary').click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#slide-details')).toBeHidden();
  await expect(details).toHaveAttribute('open', '');
  await expect(page.locator('#history #go-apphost-code')).toBeVisible();
  await expect(page.locator('#history #go-service-code')).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await expect(details).not.toHaveAttribute('open', '');
  expect(await snapshot(page)).toEqual(before);
  await page.goto('?print-pdf&theme=light');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await expect(page.locator('.pdf-page')).toHaveCount(41);
  await expect(page.locator('pre code')).toHaveCount(32);
  await expect(page.locator('#history #go-apphost-code')).toBeVisible();
  await expect(page.locator('#history #go-service-code')).toBeVisible();
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const staticPage = await context.newPage();
    await staticPage.goto(testInfo.project.use.baseURL!);
    await staticPage.locator('#history summary').click();
    await expect(staticPage.locator('#history details')).toHaveAttribute('open', '');
    await expect(staticPage.locator('#history #go-apphost-code')).toBeVisible();
    await expect(staticPage.locator('#history #go-service-code')).toBeVisible();
    await expect(staticPage.locator('#slide-details')).toBeHidden();
  } finally { await context.close(); }
});

test('every existing slide disclosure uses the same prepared dialog without cloning or a per-slide handler', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'A second ordinary disclosure proves the shared behavior.');
  await page.route((url) => url.pathname === '/inside-aspire/', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(
      '<h2>Sources and reuse</h2>', '<h2>Sources and reuse</h2><details id="extra-details"><summary>Additional source details</summary><p id="extra-content">Existing detail content.</p></details>') });
  });
  await ready(page);
  await page.evaluate(() => { location.hash = '/sources'; });
  await expect(page.locator('.slides section.present')).toHaveAttribute('id', 'sources');
  const nodes = await page.locator('#extra-content').elementHandle();
  await page.locator('#extra-details summary').click();
  await expect(page.locator('#slide-details-title')).toHaveText('Additional source details');
  expect(await nodes!.evaluate((node) => !!node.closest('#slide-details'))).toBe(true);
  await page.keyboard.press('Escape');
  expect(await nodes!.evaluate((node) => !!node.closest('#extra-details'))).toBe(true);
  await expect(page.locator('#extra-details')).not.toHaveAttribute('open', '');
  await expect(page.locator('#slide-details')).toHaveCount(1);
});

test('speaker current/upcoming state and actual native indices stay unchanged when the audience opens details or a receiver activates its summary', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One real native presenter/getState connection suffices.');
  test.setTimeout(60_000);
  await ready(page);
  await page.locator('#menu-toggle').click();
  const opened = page.waitForEvent('popup');
  await page.locator('#notes').click();
  const popup = await opened;
  try {
    const current = popup.frameLocator('#current-slide iframe');
    const upcoming = popup.frameLocator('#upcoming-slide iframe');
    await expect(current.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(upcoming.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(popup.locator('#connection-status')).toBeHidden();
    const seconds = await popup.locator('.timer .seconds-value').textContent();
    await expect.poll(() => popup.locator('.timer .seconds-value').textContent()).not.toBe(seconds);
    const nativeState = () => popup.evaluate(() => new Promise((resolve) => {
      function received(event: MessageEvent) {
        if (typeof event.data !== 'string' || !event.data.startsWith('{')) return;
        const data = JSON.parse(event.data);
        if (data.namespace === 'reveal' && data.eventName === 'callback' && data.method === 'getState') {
          window.removeEventListener('message', received);
          resolve(data.result);
        }
      }
      window.addEventListener('message', received);
      document.querySelector<HTMLIFrameElement>('#current-slide iframe')!.contentWindow!
        .postMessage(JSON.stringify({ method: 'getState', args: [] }), location.origin);
    }));
    const before = await snapshot(page);
    const revealState = await nativeState();
    expect(revealState).toMatchObject({ indexh: 38, indexv: 0, paused: false });
    expect(revealState).not.toHaveProperty('indexf');
    await page.locator('#history summary').click();
    await expect(page.locator('#slide-details')).toBeVisible();
    await expect(current.locator('#slide-details')).toBeHidden();
    await expect(upcoming.locator('#slide-details')).toBeHidden();
    await current.locator('#history summary').click();
    await expect(current.locator('#history details')).not.toHaveAttribute('open', '');
    await expect(current.locator('#slide-details')).toBeHidden();
    expect(await nativeState()).toEqual(revealState);
    expect(await snapshot(page)).toEqual(before);
    await expect(page.locator('#slide-details')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#history summary')).toBeFocused();
    await page.locator('#history summary').click();
    const currentFrame = popup.frames().find((frame) => frame.url().includes('postMessageEvents=true'))!;
    await currentFrame.evaluate(() => location.reload());
    await expect(current.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(page.locator('#slide-details')).toBeHidden();
    await expect(page.locator('#history #go-apphost-code')).toHaveCount(1);
    expect(await nativeState()).toEqual(revealState);
  } finally { await popup.close(); }
});

test('one bounded desktop/phone disclosure overlay batch is accessible, readable and collision-free', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One bounded desktop/phone visual batch, no unrelated polish.');
  for (const layout of [{ width: 1280, theme: 'dark' }, { width: 390, theme: 'light' }]) {
    await ready(page, 'present', layout.width, layout.theme);
    await page.locator('#history summary').click();
    await expect(page.locator('#slide-details')).toBeVisible();
    const result = await new AxeBuilder({ page }).include('#slide-details').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
    const path = testInfo.outputPath(`history-dialog-${layout.width}.png`);
    await page.screenshot({ path });
    await testInfo.attach(`history-dialog-${layout.width}`, { path, contentType: 'image/png' });
  }
});
