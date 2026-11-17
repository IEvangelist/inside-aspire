import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page, query = '?mode=present') {
  await page.goto(query);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
}

const slideIds = (page: Page) => page.locator('.slides > section[id]').evaluateAll((slides) => slides.map((slide) => slide.id));

function observeFirstPrintReady() {
  const observer = new MutationObserver(() => {
    if (document.documentElement.dataset.deckReady !== 'true') return;
    const pages = [...document.querySelectorAll<HTMLElement>('.pdf-page')];
    document.documentElement.dataset.testFirstPrintReady = JSON.stringify({
      pages: pages.length,
      ids: pages.map((page) => page.querySelector('section[id]')?.id),
      codeBlocks: document.querySelectorAll('.pdf-page pre > code').length,
      pageRules: document.querySelector<HTMLStyleElement>('#complete-print-pages')?.sheet?.cssRules.length ?? 0,
      clippedOutputs: [...document.querySelectorAll<HTMLElement>('.pdf-page .replay-output')]
        .filter((output) => output.getBoundingClientRect().height === 0 ||
          output.scrollHeight > output.clientHeight + 1 ||
          output.getBoundingClientRect().bottom > output.closest('.pdf-page')!.getBoundingClientRect().bottom)
        .map((output) => output.closest('section')!.id),
    });
    observer.disconnect();
  });
  observer.observe(document, { attributes: true, subtree: true, attributeFilter: ['data-deck-ready'] });
}

function expectCompletePrint(firstReady: { pages: number; ids: (string | undefined)[]; codeBlocks: number; pageRules: number; clippedOutputs: string[] }) {
  expect(firstReady.pages).toBeGreaterThan(0);
  expect(firstReady.ids).toHaveLength(firstReady.pages);
  expect(firstReady.ids.every(Boolean)).toBe(true);
  expect(new Set(firstReady.ids).size).toBe(firstReady.pages);
  expect(firstReady.pageRules).toBe(firstReady.pages);
  expect(firstReady.codeBlocks).toBeGreaterThan(0);
  expect(firstReady.clippedOutputs).toEqual([]);
}

test('template fonts, heading tracking, title-only grid, windows and squared actions are actually rendered', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit desktop/light/dark glyph and window matrix runs once.');
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const theme of ['light', 'dark']) {
    await ready(page, `?theme=${theme}&mode=present`);
    const title = page.locator('.slides > section[id]').first().locator('h1');
    await expect(title).toHaveCSS('font-weight', '650');
    expect(await page.locator('#presentation').evaluate((node) => getComputedStyle(node, '::after').opacity)).toBe('1');
    await page.locator('#next').click();
    expect(await page.locator('#presentation').evaluate((node) => getComputedStyle(node, '::after').opacity)).toBe('0');
    for (const selector of ['#next', '#menu-toggle']) {
      await expect(page.locator(selector)).toHaveCSS('border-radius', '8px');
      const box = await page.locator(selector).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const codeSlide = await page.locator('.slides > section[id]:has(.window-title):has(pre > code[id]):has(h2)').first().getAttribute('id');
    await ready(page, `?theme=${theme}&mode=present#/${codeSlide}`);
    await expect(page.locator(`#${codeSlide} pre`).first()).toHaveCSS('font-family', /^"Fira Code",/);
    await expect(page.locator(`#${codeSlide} .window-title`).first()).toHaveCSS('font-family', /^"Fira Code",/);
    const codeId = await page.locator(`#${codeSlide} pre > code[id]`).first().getAttribute('id');
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('DOM.enable');
      await session.send('CSS.enable');
      const { root } = await session.send('DOM.getDocument');
      for (const [selector, name] of [[`#${codeSlide} h2`, 'Poppins-Bold'], [`#${codeId}`, 'FiraCode']]) {
        const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector });
        const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
        expect(fonts.length).toBeGreaterThan(0);
        expect(fonts.every((font) => font.isCustomFont && font.postScriptName.startsWith(name))).toBe(true);
      }
    } finally {
      await session.detach();
    }
  }
});

test('the menu keeps heading and every presenter control fixed while only its numbered navigation list scrolls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit compact menu geometry matrix runs once.');
  for (const viewport of [{ width: 1280, height: 720 }, { width: 617, height: 600 }, { width: 390, height: 560 }, { width: 320, height: 480 }]) {
    await page.setViewportSize(viewport);
    await ready(page);
    await page.locator('#menu-toggle').click();
    const menu = page.locator('#deck-menu');
    const list = menu.locator('.menu-slides');
    const controls = menu.locator('.menu-controls');
    const heading = menu.locator('.menu-heading');
    await expect(menu).toBeVisible();
    const before = { heading: await heading.boundingBox(), controls: await controls.boundingBox() };
    expect(await list.evaluate((node) => node.scrollHeight - node.clientHeight)).toBeGreaterThan(0);
    await list.evaluate((node) => node.scrollTo({ top: node.scrollHeight, behavior: 'instant' }));
    await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    expect(await heading.boundingBox()).toEqual(before.heading);
    expect(await controls.boundingBox()).toEqual(before.controls);
    expect(await menu.evaluate((node) => node.scrollTop)).toBe(0);
    const bounds = await menu.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    expect(await menu.locator('.slide-number').count()).toBeGreaterThan(0);
    for (const button of await controls.locator('button,a').all()) {
      await expect(button).toBeInViewport();
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('#menu-toggle')).toBeFocused();
  }
});

test('paired surfaces sit side by side when their grid has two columns and stack otherwise', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One desktop/narrow pairs matrix runs once.');
  for (const width of [1280, 617, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await ready(page, `?mode=${width < 1000 ? 'read' : 'present'}`);
    for (const pair of await page.locator('.code-pair,.code-and-copy,.contrast').all()) {
      const id = await pair.evaluate((node) => node.closest('section')!.id);
      await page.evaluate((id) => { location.hash = `/${id}`; }, id);
      const columns = await pair.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
      const children = await pair.locator(':scope > *').evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().toJSON()));
      expect(children.length).toBeGreaterThanOrEqual(2);
      expect(children.every((box) => box.width > 0 && box.height > 0)).toBe(true);
      if (columns >= 2) expect(children[1].left).toBeGreaterThan(children[0].right);
      else expect(children[1].top).toBeGreaterThan(children[0].bottom);
    }
  }
});

test('copy actions copy the displayed source and the recorded command/output exactly', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One real HTTPS/localhost clipboard path suffices.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    const write = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = async (source) => {
      document.documentElement.dataset.exactClipboardWrite = source;
      return write(source);
    };
  });
  async function expectCopied(source: string) {
    expect(await page.locator('html').getAttribute('data-exact-clipboard-write')).toBe(source);
    // The Windows system clipboard normalizes line endings on read, not at our write boundary.
    await expect.poll(() => page.evaluate(async () =>
      (await navigator.clipboard.readText()).replace(/\r\n/g, '\n'))).toBe(source);
  }
  await ready(page);
  const codeSlide = await page.locator('.slides > section[id]:has(.code-step):has(.copy-code)').first().getAttribute('id');
  await ready(page, `?mode=present#/${codeSlide}`);
  await page.locator('#next').click();
  const focused = page.locator(`#${codeSlide} pre > code:has(.is-focused)`).first();
  await expect(focused).toBeVisible();
  await page.locator(`#${codeSlide} figure:has(code .is-focused) .copy-code`).first().click();
  await expectCopied(await focused.textContent() ?? '');

  await ready(page);
  const replaySlide = await page.locator('.slides > section[id]:has([data-copy-output])').first().getAttribute('id');
  await ready(page, `?mode=present#/${replaySlide}`);
  const output = page.locator(`#${replaySlide} [data-copy-output]`);
  await expect(output).toBeDisabled();
  await page.locator(`#${replaySlide} .copy-code:not([data-copy-output])`).first().click();
  await expectCopied(await page.locator(`#${replaySlide} .replay-command code`).textContent() ?? '');
  await page.locator('#next').click();
  await expect(output).toBeEnabled();
  await output.click();
  const copied = await page.locator(`#${replaySlide} .replay-output code`).textContent() ?? '';
  expect(copied.length).toBeGreaterThan(0);
  await expectCopied(copied);
  await page.locator('#previous').click();
  await expect(output).toBeDisabled();
});

for (const width of [1280, 617, 390, 320]) {
  test(`the independent ${width}px reading viewport remains vertical, aligned and correctly counted after Reveal's delayed reset`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit settled reading geometry runs once.');
    await page.setViewportSize({ width, height: 844 });
    await ready(page, '?mode=read');
    const ids = await slideIds(page);
    const replay = await page.locator('.slides > section[id]:has([data-cli-replay])').first().getAttribute('id');
    const chapter = (await page.locator('[data-core-chapter]').last().getAttribute('href'))!.replace('#/', '');
    await page.evaluate((id) => { location.hash = `/${id}`; }, replay);
    await page.waitForTimeout(1250);
    const viewport = page.locator('#slide-viewport');
    await expect(viewport).toHaveCSS('overflow-y', 'auto');
    const heading = await page.locator(`#${replay} h2`).boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(56);
    expect(heading!.y).toBeLessThan(180);
    await expect(page.locator('#slide-position')).toHaveText(`${ids.indexOf(replay!) + 1} / ${ids.length}`);
    const start = await viewport.evaluate((node) => node.scrollTop);
    await viewport.hover();
    await page.mouse.wheel(0, 500);
    await expect.poll(() => viewport.evaluate((node) => node.scrollTop)).toBeGreaterThan(start);
    await page.evaluate((id) => { location.hash = `/${id}`; }, chapter);
    await page.waitForTimeout(1250);
    await expect(page.locator('#slide-position')).toHaveText(`${ids.indexOf(chapter) + 1} / ${ids.length}`);
    await expect(page.locator(`#${chapter} h2`)).toBeInViewport();
    await expect(page.locator('#chapter-label')).toHaveText((await page.locator(`#${chapter}`).getAttribute('data-chapter'))!);
    expect(await page.locator('#presentation').evaluate((node) => node.scrollTop)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('overview thumbnails are framed, nonzero, clickable and return to the exact slide', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One actual desktop overview audit suffices.');
  await ready(page);
  const ids = await slideIds(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#presentation')).toHaveClass(/overview/);
  const boxes = await page.locator('.slides section[id]').evaluateAll((slides) => slides.map((slide) => ({
    bounds: slide.getBoundingClientRect().toJSON(), visible: getComputedStyle(slide).visibility,
    background: getComputedStyle(slide).backgroundColor, shadow: getComputedStyle(slide).boxShadow,
  })));
  expect(boxes).toHaveLength(ids.length);
  expect(boxes.every((item) => item.bounds.width > 0 && item.bounds.height > 0 &&
    item.visible === 'visible' && item.background !== 'rgba(0, 0, 0, 0)' && item.shadow !== 'none')).toBe(true);
  const target = ids[ids.length - 3];
  await page.locator(`#${target}`).click();
  await expect(page.locator('#presentation')).not.toHaveClass(/overview/);
  await expect(page).toHaveURL(new RegExp(`#/${target}`));
  await expect(page.locator('#slide-position')).toHaveText(`${ids.length - 2} / ${ids.length}`);
});

test('print emits one complete variable-height page per slide without clipping recorded stdout', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One complete actual PDF verifies page count and unclipped content.');
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ media: 'print' });
  await ready(page, '?print-pdf&theme=dark');
  const slides = await page.locator('.slides section[id]').count();
  await expect(page.locator('.pdf-page')).toHaveCount(slides);
  for (const output of await page.locator('.replay-output').all()) {
    const geometry = await output.evaluate((node) => {
      const page = node.closest('.pdf-page')!;
      return { overflow: node.scrollHeight - node.clientHeight,
        bottom: node.getBoundingClientRect().bottom, pageBottom: page.getBoundingClientRect().bottom };
    });
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.pageBottom);
  }
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true,
    path: testInfo.outputPath('inside-aspire-complete.pdf') });
  expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBe(slides);
  await expect(page.locator('.copy-code:visible')).toHaveCount(0);
});

test('print readiness waits for native pdf-ready even when the asynchronous print frames are held', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One controlled native print-startup race regression suffices.');
  await page.addInitScript(observeFirstPrintReady);
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window);
    const pending: FrameRequestCallback[] = [];
    let released = false;
    window.requestAnimationFrame = (callback) => nativeFrame((time) => {
      if (!released && document.documentElement.classList.contains('print-pdf')) {
        pending.push(callback);
        document.documentElement.dataset.testPrintFrameHeld = 'true';
      } else callback(time);
    });
    document.addEventListener('test-release-print-frames', () => {
      released = true;
      for (const callback of pending.splice(0)) nativeFrame(callback);
    }, { once: true });
  });
  await page.goto('?print-pdf', { waitUntil: 'commit' });
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-test-print-frame-held', 'true');
  await expect(root).not.toHaveAttribute('data-deck-ready', 'true');
  await expect(page.locator('.pdf-page')).toHaveCount(0);
  await page.evaluate(() => document.dispatchEvent(new Event('test-release-print-frames')));
  await expect(root).toHaveAttribute('data-deck-ready', 'true');
  const firstReady = JSON.parse(await root.getAttribute('data-test-first-print-ready') ?? 'null');
  expectCompletePrint(firstReady);
  expect(firstReady.pages).toBe(await page.locator('.slides section[id]').count());
});

test('cold print startups expose the complete deck at the first readiness signal', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'A bounded cold-context print stress batch runs once.');
  test.setTimeout(120_000);
  for (let attempt = 0; attempt < 10; attempt++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    try {
      const page = await context.newPage();
      await page.addInitScript(observeFirstPrintReady);
      await page.goto(`?print-pdf&cold-print=${attempt}`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      const firstReady = JSON.parse(await page.locator('html').getAttribute('data-test-first-print-ready') ?? 'null');
      expectCompletePrint(firstReady);
      expect(firstReady.pages, `Cold print load ${attempt + 1}`).toBe(await page.locator('.slides section[id]').count());
    } finally {
      await context.close();
    }
  }
});

test('one bounded desktop projector and narrow visual batch retains actual rich talk surfaces', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'The whole visual matrix is captured once.');
  test.setTimeout(90_000);
  for (const layout of [
    { width: 1280, height: 720, theme: 'dark', mode: 'present' },
    { width: 1920, height: 1080, theme: 'light', mode: 'present' },
    { width: 1024, height: 576, theme: 'light', mode: 'present' },
    { width: 390, height: 844, theme: 'dark', mode: 'read' },
  ] as const) {
    await page.setViewportSize(layout);
    await page.emulateMedia({ colorScheme: layout.theme, reducedMotion: 'reduce' });
    await ready(page, `?theme=${layout.theme}&mode=${layout.mode}`);
    const ids = (await slideIds(page)).filter((_, index, all) => index % Math.ceil(all.length / 6) === 0);
    for (const id of ids) {
      await page.evaluate((id) => { location.hash = `/${id}`; }, id);
      await expect(page.locator(`#${id}`)).toBeInViewport();
      const path = testInfo.outputPath(`${id}-${layout.width}x${layout.height}-${layout.theme}.png`);
      await page.screenshot({ path });
      await testInfo.attach(`${id}-${layout.width}-${layout.theme}`, { path, contentType: 'image/png' });
    }
  }
});
