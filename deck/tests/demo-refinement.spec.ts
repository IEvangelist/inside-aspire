import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const evidence = JSON.parse(readFileSync(resolve('..', 'docs', 'evidence', 'browser-logs.json'), 'utf8'));

for (const theme of ['light', 'dark'] as const) {
  for (const mode of ['present', 'read'] as const) {
    test(`opening advances sequentially by pointer and keyboard in ${theme} ${mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit input/theme/mode matrix runs once.');
      await page.setViewportSize({ width: mode === 'read' ? 390 : 1280, height: mode === 'read' ? 844 : 720 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'no-preference' });
      for (const input of ['pointer', 'keyboard']) {
        await page.goto(`?theme=${theme}&mode=${mode}`);
        await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
        const start = page.getByRole('link', { name: 'Start presentation' });
        await expect(start).toHaveAttribute('href', '#/thesis');
        if (input === 'pointer') await start.click();
        else {
          await start.focus();
          await page.keyboard.press('Enter');
        }
        await expect(page).toHaveURL(/#\/thesis$/);
        await expect(page.locator('#thesis h2')).toBeInViewport();
        await expect(page.locator('#slide-position')).toHaveText('2 / 41');
        const bounds = await page.locator('#thesis h2').boundingBox();
        const toolbar = await page.locator('.toolbar').boundingBox();
        expect(bounds!.y).toBeGreaterThanOrEqual(toolbar!.y + toolbar!.height - 1);
        await page.locator('#menu-toggle').click();
        await page.locator('[data-slide="the-loop"]').click();
        await expect(page).toHaveURL(/#\/the-loop(?:\/\d+)?$/);
        await expect(page.locator('#the-loop h2')).toBeInViewport();
      }
    });
  }
  for (const viewport of [
    { width: 2000, height: 1000, mode: 'present' },
    { width: 1280, height: 720, mode: 'present' },
    { width: 1024, height: 768, mode: 'present' },
    { width: 1024, height: 576, mode: 'present' },
    { width: 790, height: 900, mode: 'read' },
    { width: 390, height: 844, mode: 'read' },
    { width: 320, height: 844, mode: 'read' },
    { width: 1440, height: 900, mode: 'print' },
  ] as const) {
    test(`actual screenshot area fills its ${theme} ${viewport.width}x${viewport.height} ${viewport.mode} layout`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit image geometry matrix runs once.');
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce', media: viewport.mode === 'print' ? 'print' : 'screen' });
      await page.goto(`?theme=${theme}&${viewport.mode === 'print' ? 'print-pdf' : `mode=${viewport.mode}`}#/weather`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      await page.evaluate(() => document.fonts.ready);
      for (const id of ['weather', 'evidence', 'writer']) {
        await page.evaluate((slideId) => { location.hash = `/${slideId}`; }, id);
        const image = page.locator(`#${id} figure > img:visible`).first();
        if (viewport.mode === 'print') await image.scrollIntoViewIfNeeded();
        await expect(image).toBeVisible();
        await expect.poll(() => image.evaluate((element) =>
          element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
        const geometry = await image.evaluate((element) => {
          if (!(element instanceof HTMLImageElement)) throw new Error('Expected a truthful source image.');
          const bounds = element.getBoundingClientRect();
          const parent = element.parentElement!.getBoundingClientRect();
          const scale = bounds.height / element.clientHeight;
          const fit = Math.min(bounds.width / element.naturalWidth, bounds.height / element.naturalHeight);
          const paintedWidth = element.naturalWidth * fit;
          const paintedHeight = element.naturalHeight * fit;
          return {
            width: bounds.width, height: bounds.height, right: bounds.right, bottom: bounds.bottom,
            parentWidth: parent.width, ratio: element.naturalWidth / element.naturalHeight,
            paintedArea: paintedWidth * paintedHeight,
            boxArea: bounds.width * bounds.height,
            previousWeatherArea: (500 * scale) ** 2 * element.naturalWidth / element.naturalHeight,
            sourceWidth: element.naturalWidth, sourceHeight: element.naturalHeight,
          };
        });
        expect(Math.abs(geometry.width / geometry.height - geometry.ratio)).toBeLessThan(0.01);
        expect(geometry.paintedArea / geometry.boxArea).toBeGreaterThanOrEqual(0.99);
        expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
        if (viewport.mode === 'present') expect(geometry.bottom).toBeLessThan(viewport.height - 1);
        if (id === 'weather') {
          expect(geometry.sourceWidth).toBe(1440);
          expect(geometry.sourceHeight).toBe(1000);
          if (viewport.mode === 'present') {
            expect(geometry.paintedArea / geometry.previousWeatherArea).toBeGreaterThanOrEqual(1.3);
          } else if (viewport.mode === 'read') expect(geometry.width).toBeGreaterThanOrEqual(geometry.parentWidth - 1);
          await expect(page.locator('#weather figcaption')).toContainText('Provider attribution retained');
          if (viewport.width === 1280) {
            const path = testInfo.outputPath(`weather-${theme}.png`);
            await page.screenshot({ path });
            await testInfo.attach('larger-actual-weather-content', { path, contentType: 'image/png' });
          }
        } else expect(geometry.width).toBeGreaterThanOrEqual(geometry.parentWidth - 1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

test('audience command text is directly copyable Aspire CLI with verified identities', async ({ page }) => {
  await page.goto('#/live-cli');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const commands = evidence.cli.commands.join('\n');
  const codes = page.locator('#live-cli .replay-command code, #docs-section .replay-command code, #api-search .replay-command code, #api-member .replay-command code');
  expect((await codes.allTextContents()).join('\n')).toBe(commands);
  const selected = await codes.evaluateAll((elements) => elements.map((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    return range.toString();
  }).join('\n'));
  expect(selected).toBe(commands);
  expect(selected).not.toMatch(/pwsh|\.ps1|\$aspire|\$id/);
  expect(selected.split('\n')).toHaveLength(4);
  for (const command of selected.split('\n').filter((line) => line.startsWith('aspire docs api get'))) {
    expect(command).not.toContain('--language');
    expect(command).toContain(evidence.cli.apiId);
  }
  await expect(page.locator('#api-code code').first()).toContainText(evidence.cli.apiId);
  await expect(page.locator('#live-cli .notes')).toContainText('No PowerShell script is required');
});

test('feature story preserves real links, experimental scope, and explicit maintainer refinement', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await expect(page.locator('#evidence .github-brand')).toHaveAttribute('href', evidence.product.url);
  const trail = await page.locator('#evidence .evidence-chain a').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href')));
  expect(trail).toEqual([evidence.product.url, evidence.workflow.url, evidence.docs.url, evidence.published.markdown]);
  await expect(page.locator('#writer a[href*="/commit/"]')).toHaveAttribute('href', evidence.docs.refinementUrl);
  await expect(page.locator('#workflow .github-brand')).toHaveAttribute('href', evidence.workflow.source);
  const pr = JSON.parse(await page.locator('#workflow .language-json').textContent() ?? 'null');
  expect(pr).toEqual({ number: 775, state: 'closed', merged: true, merged_by: { login: 'davidfowl' } });
  await expect(page.locator('#browser-evidence')).toContainText(evidence.scope.experimentalDiagnostic);
  await expect(page.locator('#browser-evidence')).toContainText(evidence.scope.package);
  await expect(page.locator('#browser-evidence')).toContainText('not wired into this weather app');
  await expect(page.locator('#browser-evidence .notes')).toContainText('child browser resource');
  const audience = await page.locator('section[id]').allTextContents();
  expect(audience.join('\n')).not.toMatch(/19478|33887017276|1619|human_reviews|outcome_status|Show-DocsLoop\.ps1/);
  await expect(page.locator('section[id]')).toHaveCount(41);
});

test('three-area audience surfaces render coherently in one desktop/mobile visual batch', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One bounded desktop/mobile/theme capture batch is sufficient.');
  for (const layout of [
    { width: 1280, height: 720, theme: 'dark', mode: 'present' },
    { width: 390, height: 844, theme: 'light', mode: 'read' },
  ]) {
    await page.setViewportSize(layout);
    await page.emulateMedia({ colorScheme: layout.theme === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    await page.goto(`?theme=${layout.theme}&mode=${layout.mode}`);
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await page.evaluate(() => document.fonts.ready);
    for (const id of ['thesis', 'ai-loops', 'live-cli', 'api-code', 'act-precisely', 'weather',
      'skills-vs-tools', 'stay-current', 'docs-supply', 'dashboard', 'dashboard-integrated',
      'dashboard-standalone', 'deployment', 'deployment-model', 'deployment-publish', 'deployment-deploy', 'close']) {
      await page.evaluate((slideId) => { location.hash = `/${slideId}`; }, id);
      const slide = page.locator(`#${id}`);
      await expect(slide.locator(layout.mode === 'present' && id === 'live-cli' ? '.cli-terminal' : 'h1,h2').first()).toBeInViewport();
      const path = testInfo.outputPath(`${id}-${layout.width}-${layout.theme}.png`);
      await slide.screenshot({ path });
      await testInfo.attach(`${id}-${layout.width}-${layout.theme}`, { path, contentType: 'image/png' });
    }
  }
});
