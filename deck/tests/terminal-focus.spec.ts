import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const focusedIds = ['live-cli', 'docs-section', 'api-member', 'runtime-state', 'runtime-traces'];
const compactIds = ['api-search', 'runtime-wait'];
const runIds: Record<string, string> = { 'live-cli': 'docs-search', 'docs-section': 'docs-section',
  'api-member': 'api-member', 'runtime-state': 'runtime-describe', 'runtime-traces': 'runtime-traces' };

function stdout(id: string) {
  return readFileSync(resolve('public', 'replays', `${runIds[id]}.stdout.txt`), 'utf8').replace(/\n$/, '');
}

async function ready(page: Page, id: string, mode = 'present', theme = 'dark', fragment = '') {
  await page.goto(`?theme=${theme}&mode=${mode}#/${id}${fragment}`);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
}

test('the configured guidance replay reclaims actual title/footer space instead of keeping a short output pane', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One real pre-fix/final geometry regression suffices.');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route((url) => url.pathname === '/inside-aspire/', async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(
      /<section id="docs-section"[\s\S]*?<\/section>/,
      (section) => section.includes('data-terminal-focus=')
        ? section : section.replace('<section ', '<section data-terminal-focus="true" ')
          .replace('class="source-line"', 'class="source-line terminal-support"'));
    await route.fulfill({ response, body: html });
  });
  await ready(page, 'docs-section');
  const slide = page.locator('#docs-section');
  const heading = (await slide.locator('h2').boundingBox())!;
  await page.locator('#next').click();
  await expect(slide.locator('[data-cli-replay]')).toHaveAttribute('data-replay-phase', 'complete');
  const panel = (await slide.locator('.cli-terminal').boundingBox())!;
  expect(panel.y, 'The terminal must occupy the former title space.').toBeLessThanOrEqual(heading.y + 1);
  const output = (await slide.locator('.replay-output').boundingBox())!;
  expect(output.height, 'The actual output viewport must grow, not only receive a focus class.').toBeGreaterThan(330);
  await expect(slide.locator('h2')).toBeHidden();
  await expect(slide.locator('.terminal-support')).toBeHidden();
  await expect(slide.locator('figcaption')).toContainText('Recorded CLI run');
});

test('authored focus opts in only the five long responses; invalid values and structures fail visibly with slide identity', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Strict authoring/startup validation is viewport independent.');
  await ready(page, 'docs-section');
  expect(await page.locator('[data-terminal-focus]').evaluateAll((slides) => slides.map((slide) => slide.id))).toEqual(focusedIds);
  await expect(page.locator('.terminal-support')).toHaveCount(5);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const change of ['false', '', 'TRUE', '1', 'nested', 'duplicate', 'stack']) {
    await page.route((url) => url.pathname === '/inside-aspire/', async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(/<section id="docs-section"[\s\S]*?<\/section>/, (section) => {
        if (change === 'nested') return section.replace('<figure ', '<div><figure ').replace('</figure>', '</figure></div>');
        if (change === 'duplicate') return section.replace('<span class="fragment replay-step"', '<figure data-cli-replay="invalid"></figure><span class="fragment replay-step"');
        if (change === 'stack') return section.replace('</section>', '<section id="invalid-child"></section></section>');
        return section.replace('data-terminal-focus="true"', `data-terminal-focus="${change}"`);
      });
      await route.fulfill({ response, body: html });
    });
    await page.goto('?mode=present#/docs-section');
    await expect(page.locator('#deck-status')).toContainText('Terminal focus: slide #docs-section:');
    await expect(page.locator('#deck-status')).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-deck-ready', 'true');
    expect(errors.at(-1)).toContain('#docs-section:');
    await page.unrouteAll();
  }
});

for (const theme of ['light', 'dark'] as const) {
  test(`all configured outputs gain real safe height, copy exactly, scroll fully and rewind in ${theme}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit all-slide/theme/desktop/narrow geometry matrix runs once.');
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: theme });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: async (text: string) => { document.documentElement.dataset.copiedText = text; },
      } });
    });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 },
      { width: 617, height: 844 }, { width: 390, height: 844 }, { width: 320, height: 844 }]) {
      await page.setViewportSize(viewport);
      for (const id of focusedIds) {
        await ready(page, id, 'present', theme);
        const slide = page.locator(`#${id}`);
        const terminal = slide.locator('.cli-terminal');
        const before = (await terminal.boundingBox())!;
        const heading = await slide.locator('h2').textContent();
        const support = await slide.locator('.terminal-support').textContent();
        const scale = await page.evaluate(() => parseFloat(document.documentElement.style.getPropertyValue('--slide-scale')));
        await expect(slide.locator('h2')).toBeVisible();
        await expect(slide.locator('.terminal-support')).toBeVisible();
        await page.locator('#next').click();
        await expect(terminal).toHaveAttribute('data-replay-phase', 'complete');
        await expect(slide).toHaveClass(/is-terminal-focused/);
        const geometry = await terminal.evaluate((element) => {
          const panel = element.getBoundingClientRect();
          const body = element.querySelector<HTMLElement>('.replay-output')!;
          const output = body.getBoundingClientRect();
          const caption = element.querySelector('figcaption')!.getBoundingClientRect();
          const toolbar = document.querySelector('.toolbar')!.getBoundingClientRect();
          const badge = document.querySelector('#slide-position')!.getBoundingClientRect();
          return { panel: panel.toJSON(), output: output.toJSON(), caption: caption.toJSON(),
            toolbarBottom: toolbar.bottom, badgeTop: badge.top,
            horizontal: body.scrollWidth - body.clientWidth, font: parseFloat(getComputedStyle(body).fontSize),
            owners: [...element.querySelectorAll('*'), element].filter((child) =>
              ['auto', 'scroll'].includes(getComputedStyle(child).overflowY) ||
              ['auto', 'scroll'].includes(getComputedStyle(child).overflowX)).map((child) => child.className) };
        });
        expect(geometry.panel.top).toBeGreaterThanOrEqual(geometry.toolbarBottom + 8);
        expect(geometry.panel.top).toBeLessThan(before.y - 30);
        expect(geometry.panel.left).toBeGreaterThanOrEqual(15);
        expect(geometry.panel.right).toBeLessThanOrEqual(viewport.width - 15);
        expect(geometry.panel.bottom).toBeLessThanOrEqual(geometry.badgeTop - 12);
        expect(geometry.output.height).toBeGreaterThan(330 * scale + 60);
        expect(geometry.output.height).toBeGreaterThan(160);
        expect(geometry.panel.bottom - geometry.output.bottom).toBeLessThanOrEqual(2);
        expect(geometry.caption.top).toBeGreaterThanOrEqual(geometry.panel.top);
        expect(geometry.horizontal).toBeLessThanOrEqual(1);
        expect(geometry.font).toBeGreaterThanOrEqual(viewport.width >= 1000 ? 22 : viewport.width > 600 ? 18 : 16);
        expect(geometry.owners).toEqual(['replay-output']);
        expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(viewport.height);
        await expect(slide.locator('h2')).toBeHidden();
        expect(await slide.locator('h2').evaluate((element) => element.hidden)).toBe(false);
        await expect(slide.locator('h2')).toHaveText(heading ?? '');
        await expect(slide.locator('.terminal-support')).toHaveText(support ?? '');
        expect(await slide.locator('.terminal-support').evaluate((element) => element.inert && element.hidden)).toBe(true);
        for (const link of await slide.locator('.terminal-support a').all()) {
          expect(await link.evaluate((element) => { element.focus(); return document.activeElement === element; })).toBe(false);
        }
        const body = terminal.locator('.replay-output');
        const anchors = [await terminal.locator('figcaption').boundingBox(), await terminal.locator('.replay-command-line').boundingBox()];
        await body.focus();
        await page.keyboard.press('End');
        await expect.poll(() => body.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThanOrEqual(1);
        await expect(body.locator('.code-line').last()).toBeInViewport();
        await body.evaluate((element) => element.scrollTo({ top: element.scrollHeight, behavior: 'instant' }));
        expect([await terminal.locator('figcaption').boundingBox(), await terminal.locator('.replay-command-line').boundingBox()]).toEqual(anchors);
        expect(await page.evaluate(() => [
          document.documentElement, document.body, ...document.querySelectorAll<HTMLElement>('.reveal, .slide-viewport, .slides, section.present, section.present .cli-terminal, section.present .replay-response'),
        ].map((element) => element.scrollTop))).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
        expect(await body.locator('code').textContent()).toBe(stdout(id));
        await terminal.locator('[data-copy-output]').click();
        await expect(page.locator('html')).toHaveAttribute('data-copied-text', stdout(id));
        const status = (await page.locator('#deck-status').boundingBox())!;
        expect(status.y).toBeGreaterThanOrEqual(geometry.panel.bottom + 8);
        await page.locator('#previous').click();
        await expect(terminal).toHaveAttribute('data-replay-phase', 'command');
        await expect(slide.locator('h2')).toBeVisible();
        await expect(slide.locator('.terminal-support')).toBeVisible();
        expect(await slide.locator('.terminal-support').evaluate((element) => element.inert || element.hidden)).toBe(false);
        expect((await terminal.boundingBox())!.y).toBeCloseTo(before.y, 0);
        expect((await terminal.boundingBox())!.height).toBeCloseTo(before.height, 0);
      }
    }
  });
}

test('compact unconfigured replays keep their title, support and command anchor', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Unconfigured parity is explicitly exercised once.');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const id of compactIds) {
    await ready(page, id);
    const slide = page.locator(`#${id}`);
    const before = await slide.locator('.replay-command').boundingBox();
    await page.locator('#next').click();
    await expect(slide.locator('.cli-terminal')).toHaveAttribute('data-replay-phase', 'complete');
    expect(await slide.locator('.replay-command').boundingBox()).toEqual(before);
    await expect(slide.locator('h2')).toBeVisible();
    await expect(slide.locator('.source-line')).toBeVisible();
    await expect(slide).not.toHaveClass(/is-terminal-focused/);
    await expect(page.locator('#presentation')).not.toHaveClass(/has-terminal-focus/);
  }
});

test('focused fragment deep links, Back/Forward, overview and hidden-link focus restore exact audience state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One real browser history/focus/overview path suffices.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page, 'docs-section');
  const slide = page.locator('#docs-section');
  const link = slide.locator('.terminal-support a').first();
  await link.focus();
  await page.evaluate(() => { location.hash = '/docs-section/0'; });
  await expect(slide).toHaveClass(/is-terminal-focused/);
  await expect(slide.locator('.cli-terminal')).toHaveAttribute('data-replay-phase', 'complete');
  await expect(slide.locator('.replay-command')).toBeFocused();
  await expect(page.locator('#slide-position')).toHaveAttribute('aria-label', 'Slide 12 of 41');
  await page.goBack();
  await expect(slide).not.toHaveClass(/is-terminal-focused/);
  await expect(link).toBeFocused();
  await page.goForward();
  await expect(slide).toHaveClass(/is-terminal-focused/);
  await page.locator('#next').click();
  await expect(page.locator('.slides section.present')).toHaveAttribute('id', 'api-search');
  await expect(page.locator('#slide-position')).toHaveAttribute('aria-label', 'Slide 13 of 41');
  await page.goBack();
  await expect(slide).toHaveClass(/is-terminal-focused/);
  await page.locator('#presentation').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#presentation')).toHaveClass(/overview/);
  await expect(slide).not.toHaveClass(/is-terminal-focused/);
  await expect(slide.locator('.terminal-support')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(slide).toHaveClass(/is-terminal-focused/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await expect(slide).toHaveClass(/is-terminal-focused/);
  await expect(slide.locator('.replay-output code')).toHaveText(stdout('docs-section'));
});

test('all corner and hidden badge choices leave real success and denied-copy text clear of the focused terminal', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit narrow corner/status geometry runs once.');
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async () => {
        if (document.documentElement.dataset.denyCopy === 'true') throw new DOMException('Denied', 'NotAllowedError');
      },
    } });
  });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await ready(page, 'docs-section');
    for (const position of ['bottom-left', 'bottom-right', 'top-left', 'top-right', 'hidden']) {
      await page.locator('#slide-position').evaluate((element, position) => {
        element.dataset.visible = position === 'hidden' ? 'false' : 'true';
        if (position !== 'hidden') element.dataset.position = position;
      }, position);
      for (const denied of [false, true]) {
        await page.locator('html').evaluate((element, denied) => { element.dataset.denyCopy = String(denied); }, denied);
        await page.locator('#docs-section [data-copy-output]').click();
        await expect(page.locator('#deck-status')).toHaveText(denied
          ? 'Could not copy Complete recorded docs-section stdout. Allow clipboard access, or select and copy the code directly.'
          : 'Complete recorded docs-section stdout copied.');
        const geometry = await page.evaluate(() => {
          const terminal = document.querySelector('#docs-section .cli-terminal')!.getBoundingClientRect();
          const status = document.querySelector('#deck-status')!.getBoundingClientRect();
          const badge = document.querySelector('#slide-position')!.getBoundingClientRect();
          const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
          return { terminal: terminal.toJSON(), status: status.toJSON(), badge: badge.toJSON(),
            statusOverlap: overlaps(terminal, status), badgeOverlap: overlaps(terminal, badge),
            statusBadgeOverlap: overlaps(status, badge), pageOverflow: document.documentElement.scrollWidth > innerWidth };
        });
        expect(geometry.statusOverlap).toBe(false);
        expect(geometry.badgeOverlap).toBe(false);
        expect(geometry.statusBadgeOverlap).toBe(false);
        expect(geometry.status.left).toBeGreaterThanOrEqual(0);
        expect(geometry.status.right).toBeLessThanOrEqual(width);
        expect(geometry.status.bottom).toBeLessThanOrEqual(844);
        expect(geometry.terminal.top).toBeGreaterThanOrEqual(56 + 8);
        expect(geometry.pageOverflow).toBe(false);
      }
    }
  }
});

test('reading, print and no-JavaScript retain titles, provenance links and every complete output; reduced presentation focuses instantly', async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit static-mode/print/phone/reduced matrix runs once.');
  test.setTimeout(60_000);
  for (const width of [617, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await ready(page, 'docs-section', 'read');
    for (const id of focusedIds) {
      const slide = page.locator(`#${id}`);
      await expect(slide.locator('h2')).toBeVisible();
      await expect(slide.locator('.terminal-support')).toBeVisible();
      expect(await slide.locator('.terminal-support').evaluate((element) => element.inert || element.hidden)).toBe(false);
      expect(await slide.locator('.replay-output').evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
      expect(await slide.locator('.replay-output code').textContent()).toBe(stdout(id));
    }
  }
  await page.goto('?print-pdf&theme=light');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await expect(page.locator('.pdf-page')).toHaveCount(41);
  await expect(page.locator('pre code')).toHaveCount(32);
  for (const id of focusedIds) {
    await expect(page.locator(`#${id} h2`)).toBeVisible();
    await expect(page.locator(`#${id} .terminal-support`)).toBeVisible();
    expect(await page.locator(`#${id} .replay-output code`).textContent()).toBe(stdout(id));
  }
  await expect(page.locator('.is-terminal-focused')).toHaveCount(0);
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const staticPage = await context.newPage();
    await staticPage.goto(testInfo.project.use.baseURL ?? process.env.DECK_URL ?? 'http://127.0.0.1:4173/inside-aspire/');
    for (const id of focusedIds) {
      await expect(staticPage.locator(`#${id} h2`)).toBeVisible();
      await expect(staticPage.locator(`#${id} .terminal-support`)).toBeVisible();
      expect(await staticPage.locator(`#${id} .replay-output code`).textContent()).toBe(stdout(id));
    }
  } finally { await context.close(); }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page, 'docs-section');
  await expect(page.locator('#docs-section')).toHaveClass(/is-terminal-focused/);
  expect(await page.locator('#docs-section .cli-terminal').evaluate((element) =>
    element.getAnimations().length + element.querySelector('.replay-response')!.getAnimations().length)).toBe(0);
});

test('native Notes opened repeatedly mid-result retains audience focus and mirrors current/upcoming rewind', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Three actual native presenter connections suffice.');
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page, 'docs-section', 'present', 'dark', '/0');
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator('#menu-toggle').click();
    const opened = page.waitForEvent('popup');
    await page.locator('#notes').click();
    const popup = await opened;
    try {
      const current = popup.frameLocator('#current-slide iframe');
      const upcoming = popup.frameLocator('#upcoming-slide iframe');
      await expect(popup.locator('#connection-status')).toBeHidden();
      await expect(current.locator('#docs-section')).toHaveClass(/is-terminal-focused/);
      await expect(current.locator('#docs-section .replay-output code')).toHaveText(stdout('docs-section'));
      await expect(upcoming.locator('.slides section.present')).toHaveAttribute('id', 'api-search');
      const seconds = await popup.locator('.timer .seconds-value').textContent();
      await expect.poll(() => popup.locator('.timer .seconds-value').textContent()).not.toBe(seconds);
      await expect(page).toHaveURL(/#\/docs-section\/0$/);
      await expect(page.locator('#docs-section')).toHaveClass(/is-terminal-focused/);
      await page.locator('#previous').click();
      await expect(current.locator('#docs-section')).not.toHaveClass(/is-terminal-focused/);
      await expect(current.locator('#docs-section h2')).toBeVisible();
      await expect(current.locator('#docs-section .terminal-support')).toBeVisible();
      await expect(upcoming.locator('#docs-section')).toHaveClass(/is-terminal-focused/);
      await page.locator('#next').click();
      await expect(current.locator('#docs-section')).toHaveClass(/is-terminal-focused/);
      await expect(page.locator('#docs-section')).toHaveClass(/is-terminal-focused/);
    } finally { await popup.close(); }
  }
});

test('focused guidance layout has one bounded collapsed/expanded desktop and phone visual batch', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One desktop/phone visual batch, no open-ended polish.');
  for (const layout of [{ width: 1280, height: 720, theme: 'dark' }, { width: 390, height: 844, theme: 'light' }]) {
    await page.setViewportSize(layout);
    await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: layout.theme === 'dark' ? 'dark' : 'light' });
    await ready(page, 'docs-section', 'present', layout.theme);
    for (const state of ['collapsed', 'expanded']) {
      if (state === 'expanded') {
        await page.locator('#next').click();
        await expect(page.locator('#docs-section .cli-terminal')).toHaveAttribute('data-replay-phase', 'complete');
      }
      const path = testInfo.outputPath(`terminal-focus-${layout.width}-${state}.png`);
      await page.screenshot({ path });
      await testInfo.attach(`terminal-focus-${layout.width}-${state}`, { path, contentType: 'image/png' });
    }
  }
});
