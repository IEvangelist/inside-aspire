import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const baseline = JSON.parse(readFileSync(resolve('..', 'docs', 'evidence', 'template-ux-baseline.json'), 'utf8'));
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

async function ready(page: Page, query = '?mode=present') {
  await page.goto(query);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
}

test('the pre-port content, order, notes, code, citations, media, focus steps and paired layouts remain exact', async ({ page }) => {
  const response = await page.request.get('');
  expect(response.status()).toBe(200);
  const actual = await page.evaluate((source) => {
    const document = new DOMParser().parseFromString(source, 'text/html');
    document.querySelectorAll('[data-ux-decoration], [data-illustrative-addition]').forEach((node) => node.remove());
    return [...document.querySelectorAll<HTMLElement>('.slides > section[id]')].map((slide) => ({
      id: slide.id, chapter: slide.getAttribute('data-chapter'), purpose: slide.getAttribute('data-purpose'),
      appendix: slide.getAttribute('data-appendix'), text: slide.textContent!.replace(/\s+/g, ' ').trim(),
      notes: slide.querySelector('.notes')!.textContent!,
      codes: [...slide.querySelectorAll('pre > code')].map((code) => ({ language: code.className, text: code.textContent! })),
      links: [...slide.querySelectorAll('a')].map((link) => link.getAttribute('href')),
      images: [...slide.querySelectorAll('img')].map((image) => ({
        src: image.getAttribute('src'), alt: image.getAttribute('alt'), width: image.getAttribute('width'), height: image.getAttribute('height'),
      })),
      steps: [...slide.querySelectorAll('.code-step')].map((step) => ({
        code: step.getAttribute('data-code'), lines: step.getAttribute('data-lines'), index: step.getAttribute('data-fragment-index'),
      })),
      replay: slide.querySelector('[data-cli-replay]')?.getAttribute('data-cli-replay') ?? null,
      diagrams: [...slide.querySelectorAll('[data-diagram]')].map((mount) => mount.getAttribute('data-diagram')),
      pairs: [...slide.querySelectorAll('.code-pair,.code-and-copy,.contrast')].map((pair) => ({
        className: pair.className, children: pair.children.length,
      })),
    }));
  }, await response.text());
  const normalized = actual.map(({ text, notes, codes, ...slide }) => ({
    ...slide, textSha256: hash(text), notesSha256: hash(notes),
    codes: codes.map(({ text, language }) => ({ language, sha256: hash(text) })),
  }));
  expect(normalized).toEqual(baseline.slides);
  expect(normalized).toHaveLength(41);
});

test('all 226 protected native, skill, script, abstract, asset and actual-proof blobs match the pre-port inventory', () => {
  const files: { path: string; gitBlob: string }[] = baseline.protectedFiles;
  expect(files).toHaveLength(226);
  const actual = execFileSync('git', ['hash-object', '--stdin-paths'], {
    cwd: resolve('..'), encoding: 'utf8', input: files.map((file) => file.path).join('\n') + '\n',
  }).trim().split('\n');
  expect(actual).toEqual(files.map((file) => file.gitBlob));
});

test('template719 fonts, heading tracking, title-only grid, windows and squared actions are actually rendered', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit desktop/light/dark glyph and window matrix runs once.');
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const theme of ['light', 'dark']) {
    await ready(page, `?theme=${theme}&mode=present`);
    await expect(page.locator('#intro h1')).toHaveCSS('font-weight', '650');
    await expect(page.locator('#intro h1')).toHaveCSS('letter-spacing', '0.84px');
    expect(await page.locator('#presentation').evaluate((node) => getComputedStyle(node, '::after').opacity)).toBe('1');
    await page.locator('#next').click();
    expect(await page.locator('#presentation').evaluate((node) => getComputedStyle(node, '::after').opacity)).toBe('0');
    for (const selector of ['#next', '#menu-toggle']) {
      await expect(page.locator(selector)).toHaveCSS('border-radius', '8px');
      const box = await page.locator(selector).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await ready(page, `?theme=${theme}&mode=present#/lifecycle`);
    await expect(page.locator('#lifecycle pre')).toHaveCSS('font-family', /^"Fira Code",/);
    await expect(page.locator('#lifecycle .window-title')).toHaveCSS('font-family', /^"Fira Code",/);
    expect(await page.locator('#lifecycle figcaption').evaluate((node) =>
      getComputedStyle(node, '::before').backgroundImage)).toContain('radial-gradient');
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('DOM.enable');
      await session.send('CSS.enable');
      const { root } = await session.send('DOM.getDocument');
      for (const [selector, name] of [['#lifecycle h2', 'Poppins-Bold'], ['#apphost-code', 'FiraCode']]) {
        const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector });
        const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
        expect(fonts.length).toBeGreaterThan(0);
        expect(fonts.every((font) => font.isCustomFont && font.postScriptName.startsWith(name))).toBe(true);
      }
    } finally {
      await session.detach();
    }
    await ready(page, `?theme=${theme}&mode=present#/the-loop`);
    await expect(page.locator('#the-loop .diagram-window')).toBeVisible();
    await expect(page.locator('#the-loop .window-chrome')).toContainText('CLI');
    expect(await page.locator('#the-loop .window-chrome').evaluate((node) =>
      getComputedStyle(node, '::before').backgroundImage)).toContain('radial-gradient');
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
    await expect(menu.locator('.slide-number')).toHaveCount(11);
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

test('all ten side-by-side surfaces retain desktop columns and natural narrow DOM order', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One exact desktop/narrow pairs matrix runs once.');
  for (const width of [1280, 617, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await ready(page, `?mode=${width < 1000 ? 'read' : 'present'}`);
    const pairs = await page.locator('.code-pair,.code-and-copy,.contrast').count();
    expect(pairs).toBe(10);
    for (const pair of await page.locator('.code-pair,.code-and-copy,.contrast').all()) {
      const id = await pair.evaluate((node) => node.closest('section')!.id);
      await page.evaluate((id) => { location.hash = `/${id}`; }, id);
      const children = await pair.locator(':scope > *').evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().toJSON()));
      expect(children).toHaveLength(2);
      expect(children.every((box) => box.width > 0 && box.height > 0)).toBe(true);
      if (width >= 1000) expect(children[1].left).toBeGreaterThan(children[0].right);
      else expect(children[1].top).toBeGreaterThan(children[0].bottom);
    }
  }
});

test('the new copy actions preserve original highlighted source and whole recorded command/output exactly', async ({ page, context }, testInfo) => {
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
  await ready(page, '?mode=present#/lifecycle');
  await page.locator('#next').click();
  await expect(page.locator('#apphost-code .is-focused')).toHaveCount(5);
  await page.locator('#lifecycle .copy-code').click();
  await expectCopied(await page.locator('#apphost-code').textContent() ?? '');
  await ready(page, '?mode=present#/api-member');
  const output = page.locator('#api-member [data-copy-output]');
  await expect(output).toBeDisabled();
  await page.getByRole('button', { name: 'Copy Recorded api-member command', exact: true }).click();
  await expectCopied(await page.locator('#api-member .replay-command code').textContent() ?? '');
  await page.locator('#next').click();
  await expect(output).toBeEnabled();
  await output.click();
  const copied = await page.locator('#api-member .replay-output code').textContent() ?? '';
  await expectCopied(copied);
  expect(JSON.parse(copied).content).toContain('ASPIREBROWSERLOGS001');
  await page.locator('#previous').click();
  await expect(output).toBeDisabled();
});

for (const width of [1280, 617, 390, 320]) {
  test(`the independent ${width}px reading viewport remains vertical, aligned and correctly counted after Reveal's delayed reset`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit settled reading geometry runs once.');
    await page.setViewportSize({ width, height: 844 });
    await ready(page, '?mode=read#/api-member');
    await page.waitForTimeout(1250);
    const viewport = page.locator('#slide-viewport');
    await expect(viewport).toHaveCSS('overflow-y', 'auto');
    const heading = await page.locator('#api-member h2').boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(56);
    expect(heading!.y).toBeLessThan(180);
    await expect(page.locator('#slide-position')).toHaveText('14 / 41');
    const start = await viewport.evaluate((node) => node.scrollTop);
    await viewport.hover();
    await page.mouse.wheel(0, 500);
    await expect.poll(() => viewport.evaluate((node) => node.scrollTop)).toBeGreaterThan(start);
    await page.evaluate(() => { location.hash = '/dashboard'; });
    await page.waitForTimeout(1250);
    await expect(page.locator('#slide-position')).toHaveText('29 / 41');
    await expect(page.locator('#dashboard h2')).toBeInViewport();
    await expect(page.locator('#chapter-label')).toHaveText('Aspire dashboard');
    expect(await page.locator('#presentation').evaluate((node) => node.scrollTop)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('overview thumbnails are framed, nonzero, clickable and return to the exact slide', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One actual desktop overview audit suffices.');
  await ready(page, '?mode=present#/dashboard');
  await page.keyboard.press('Escape');
  await expect(page.locator('#presentation')).toHaveClass(/overview/);
  const slides = page.locator('.slides section[id]');
  await expect(slides).toHaveCount(41);
  const boxes = await slides.evaluateAll((slides) => slides.map((slide) => ({
    bounds: slide.getBoundingClientRect().toJSON(), visible: getComputedStyle(slide).visibility,
    background: getComputedStyle(slide).backgroundColor, shadow: getComputedStyle(slide).boxShadow,
  })));
  expect(boxes.every((item) => item.bounds.width > 0 && item.bounds.height > 0 &&
    item.visible === 'visible' && item.background !== 'rgba(0, 0, 0, 0)' && item.shadow !== 'none')).toBe(true);
  await page.locator('#dashboard-standalone').click();
  await expect(page.locator('#presentation')).not.toHaveClass(/overview/);
  await expect(page).toHaveURL(/#\/dashboard-standalone/);
  await expect(page.locator('#slide-position')).toHaveText('31 / 41');
});

test('print emits one complete variable-height page per original slide without clipping recorded stdout', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One complete actual PDF verifies page count and unclipped content.');
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ media: 'print' });
  await ready(page, '?print-pdf&theme=dark');
  await expect(page.locator('.pdf-page')).toHaveCount(41);
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
  expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBe(41);
  await expect(page.locator('.copy-code:visible')).toHaveCount(0);
});

test('one bounded desktop projector and narrow visual batch retains actual rich talk surfaces', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'The whole visual matrix is captured once.');
  test.setTimeout(90_000);
  for (const layout of [
    { width: 1280, height: 720, theme: 'dark', mode: 'present' },
    { width: 1920, height: 1080, theme: 'light', mode: 'present' },
    { width: 1024, height: 768, theme: 'dark', mode: 'present' },
    { width: 1024, height: 576, theme: 'light', mode: 'present' },
    { width: 617, height: 900, theme: 'light', mode: 'read' },
    { width: 390, height: 844, theme: 'dark', mode: 'read' },
    { width: 320, height: 760, theme: 'light', mode: 'read' },
  ] as const) {
    await page.setViewportSize(layout);
    await page.emulateMedia({ colorScheme: layout.theme, reducedMotion: 'reduce' });
    await ready(page, `?theme=${layout.theme}&mode=${layout.mode}`);
    for (const id of ['intro', 'thesis', 'api-code', 'parser', 'api-member', 'the-loop', 'workflow']) {
      await page.evaluate((id) => { location.hash = `/${id}`; }, id);
      await expect(page.locator(`#${id} h1,#${id} h2`).first()).toBeInViewport();
      const path = testInfo.outputPath(`${id}-${layout.width}x${layout.height}-${layout.theme}.png`);
      await page.screenshot({ path });
      await testInfo.attach(`${id}-${layout.width}-${layout.theme}`, { path, contentType: 'image/png' });
    }
  }
});
