import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { completeStdout, displayedRun, displayedRuns, surfaces } from './replay-fixtures';

async function open(page: Page, id: string, theme = 'dark', mode = 'present') {
  await page.goto(`?theme=${theme}&mode=${mode}#/${id}`);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
}

test('public replay files are non-empty and free of terminal escapes, local paths and tokens', () => {
  for (const run of displayedRuns) {
    for (const url of [run.stdout, run.stderr]) {
      const content = readFileSync(resolve('public', 'replays', url.split('/').at(-1)!));
      expect(content.toString()).not.toMatch(/\x1b|\b[A-Z]:[\\/]|[?&](?:t|token|api[-_]?key)=/i);
    }
    expect(completeStdout(run).trim().length).toBeGreaterThan(0);
  }
});

for (const theme of ['light', 'dark'] as const) {
  test(`actual replay result stages fit projector and short aspect layouts in ${theme}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit projector/aspect/theme stage matrix runs once.');
    await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: theme });
    for (const viewport of [{ width: 1024, height: 768 }, { width: 1024, height: 576 }]) {
      await page.setViewportSize(viewport);
      for (const [id] of surfaces) {
        await open(page, id, theme);
        const panel = page.locator(`#${id} [data-cli-replay]`);
        await expect(panel.locator('.replay-response')).toBeHidden();
        await page.locator('#next').click();
        await expect(panel).toHaveAttribute('data-replay-phase', 'complete');
        const geometry = await panel.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const output = element.querySelector<HTMLElement>('.replay-output')!;
          return { left: box.left, right: box.right, bottom: box.bottom,
            overflow: output.scrollWidth - output.clientWidth,
            overflowX: getComputedStyle(output).overflowX,
            gap: box.bottom - output.getBoundingClientRect().bottom,
            font: parseFloat(getComputedStyle(output).fontSize) };
        });
        expect(geometry.left).toBeGreaterThanOrEqual(0);
        expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
        expect(geometry.bottom).toBeLessThanOrEqual(viewport.height - 1);
        if (id.startsWith('deployment-') && geometry.overflow > 1) {
          expect(geometry.overflowX).toMatch(/auto|scroll/);
        } else expect(geometry.overflow).toBeLessThanOrEqual(1);
        expect(geometry.gap).toBeLessThanOrEqual(2);
        expect(geometry.font).toBeGreaterThanOrEqual(22);
      }
    }
  });
  test(`one command expands to its actual result and rewinds with its configured anchor in ${theme}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit presenter/theme expansion runs once.');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: theme });
    for (const [id, runId] of surfaces) {
      await open(page, id, theme);
      const record = displayedRun(runId);
      const terminal = page.locator(`#${id} [data-cli-replay]`);
      const command = terminal.locator('.replay-command code');
      const response = terminal.locator('.replay-response');
      await expect(terminal).toHaveAttribute('data-replay-phase', 'command');
      await expect(command).toHaveText(record.command);
      await expect(response).toBeHidden();
      await expect(terminal.locator('figcaption')).toBeVisible();
      expect(await page.locator('.slides section.present .replay-command:visible').count()).toBe(1);
      await page.locator(`#${id}`).evaluate(async (slide) => {
        await Promise.all(slide.getAnimations().map((animation) => animation.finished));
      });
      const before = await terminal.boundingBox();
      const anchor = await command.boundingBox();
      await terminal.evaluate((element) => {
        const states: { phase: string | undefined; hidden: boolean; animations: number }[] = [];
        const heights: number[] = [];
        const response = element.querySelector<HTMLElement>('.replay-response')!;
        const observer = new MutationObserver(() => {
          states.push({ phase: element.dataset.replayPhase, hidden: response.hidden,
            animations: element.getAnimations({ subtree: true }).length });
          element.dataset.testStates = JSON.stringify(states);
          if (element.dataset.replayPhase === 'expanding') {
            function frame() {
              heights.push(element.getBoundingClientRect().height);
              element.dataset.testHeights = JSON.stringify(heights);
              if (element.dataset.replayPhase === 'expanding') requestAnimationFrame(frame);
            }
            requestAnimationFrame(frame);
          }
        });
        observer.observe(element, { attributes: true, attributeFilter: ['data-replay-phase'] });
      });
      await page.locator('#next').click();
      await expect(terminal).toHaveAttribute('data-replay-phase', 'complete');
      const after = await terminal.boundingBox();
      const states: { phase: string; hidden: boolean; animations: number }[] =
        JSON.parse(await terminal.getAttribute('data-test-states') ?? '[]');
      expect(states.some((state) => state.phase === 'cue' && state.hidden)).toBe(true);
      expect(states.some((state) => state.phase === 'expanding' && !state.hidden && state.animations > 0)).toBe(true);
      const heights: number[] = JSON.parse(await terminal.getAttribute('data-test-heights') ?? '[]');
      expect(heights.some((height) => height > before!.height + 5 && height < after!.height - 5)).toBe(true);
      expect(after!.height - before!.height).toBeGreaterThan(70);
      const finalAnchor = await command.boundingBox();
      if (await page.locator(`#${id}`).getAttribute('data-terminal-focus') === 'true') {
        expect(finalAnchor!.y).toBeLessThan(anchor!.y - 30);
        await expect(page.locator(`#${id} h2`)).toBeHidden();
      } else {
        expect(Math.abs(finalAnchor!.x - anchor!.x)).toBeLessThan(0.5);
        expect(Math.abs(finalAnchor!.y - anchor!.y)).toBeLessThan(0.5);
      }
      expect(await terminal.locator('.replay-output code').textContent()).toBe(completeStdout(record));
      await expect(terminal.locator('.replay-cue, .replay-excerpt')).toHaveCount(0);
      const output = await terminal.locator('.replay-output').boundingBox();
      expect(after!.y + after!.height - output!.y - output!.height).toBeLessThanOrEqual(2);
      expect(after!.y + after!.height).toBeLessThanOrEqual(719);
      if (id === 'live-cli' || id === 'runtime-wait') {
        const path = testInfo.outputPath(`${id}-${theme}-expanded.png`);
        await page.screenshot({ path });
        await testInfo.attach(`${id}-${theme}-expanded`, { path, contentType: 'image/png' });
      }
      await page.locator('#previous').click();
      await expect(terminal).toHaveAttribute('data-replay-phase', 'command');
      await expect(response).toBeHidden();
      expect(Math.abs((await terminal.boundingBox())!.height - before!.height)).toBeLessThan(1);
      expect(Math.abs((await command.boundingBox())!.y - anchor!.y)).toBeLessThan(0.5);
    }
  });
}

test('subsequent commands, normal Back, explicit fragments, and plain jumps never mismatch recorded output', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Exact progression/hash behavior is explicitly checked once.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page, 'live-cli');
  await page.locator('#next').click();
  await expect(page.locator('#live-cli [data-cli-replay]')).toHaveAttribute('data-replay-phase', 'complete');
  const order = await page.locator('.slides > section[id]').evaluateAll((slides) => slides.map((slide) => slide.id));
  const nextId = order[order.indexOf('live-cli') + 1];
  await page.locator('#next').click();
  await expect(page).toHaveURL(new RegExp(`#/${nextId}$`));
  if (await page.locator(`#${nextId} [data-cli-replay]`).count()) {
    await expect(page.locator(`#${nextId} [data-cli-replay]`)).toHaveAttribute('data-replay-phase', 'command');
    await expect(page.locator(`#${nextId} .replay-response`)).toBeHidden();
  }
  await page.locator('#previous').click();
  await expect(page.locator('#live-cli [data-cli-replay]')).toHaveAttribute('data-replay-phase', 'complete');
  await page.goto('?mode=present#/api-search/0');
  await expect(page.locator('#api-search [data-cli-replay]')).toHaveAttribute('data-replay-phase', 'complete');
  await expect(page.locator('#api-search .replay-output')).toBeVisible();
  await page.evaluate(() => { location.hash = '/live-cli'; });
  await expect(page.locator('#live-cli .replay-response')).toBeHidden();
  await expect(page.locator('#live-cli [data-cli-replay]')).toHaveAttribute('data-replay-phase', 'command');
});

for (const interruption of ['back', 'slide', 'theme', 'viewport'] as const) {
  test(`pending recorded cue settles safely on ${interruption}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit cancellation matrix runs once.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page, 'live-cli');
    const terminal = page.locator('#live-cli [data-cli-replay]');
    await page.locator('#next').click();
    await expect(terminal).toHaveAttribute('data-replay-phase', 'cue');
    if (interruption === 'back') await page.locator('#previous').click();
    if (interruption === 'slide') await page.evaluate(() => { location.hash = '/api-search'; });
    if (interruption === 'theme') await page.keyboard.press('t');
    if (interruption === 'viewport') await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(700);
    expect(await terminal.getAttribute('data-replay-phase')).not.toBe('cue');
    expect(await terminal.getAttribute('data-replay-phase')).not.toBe('expanding');
    if (interruption === 'back') await expect(terminal.locator('.replay-response')).toBeHidden();
    if (interruption === 'slide') {
      await expect(page.locator('#api-search .replay-response')).toBeHidden();
      await expect(page.locator('#api-search [data-cli-replay]')).toHaveAttribute('data-replay-phase', 'command');
    }
  });
}

for (const theme of ['light', 'dark'] as const) {
  for (const mode of ['reduce', 'read', 'print'] as const) {
    test(`all captured pairs are instantly available in ${theme} ${mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit static/theme modes run once.');
      await page.setViewportSize({ width: mode === 'read' ? 390 : 1280, height: mode === 'read' ? 844 : 720 });
      await page.emulateMedia({ colorScheme: theme, media: mode === 'print' ? 'print' : 'screen',
        reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference' });
      await page.goto(`?theme=${theme}&${mode === 'print' ? 'print-pdf' : `mode=${mode === 'read' ? 'read' : 'present'}`}`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      for (const [id, runId] of surfaces) {
        if (mode !== 'print') await page.evaluate((slideId) => { location.hash = `/${slideId}`; }, id);
        const panel = page.locator(`#${id} [data-cli-replay]`);
        if (mode === 'print') await panel.scrollIntoViewIfNeeded();
        await expect(panel).toHaveAttribute('data-replay-phase', 'complete');
        await expect(panel.locator('.replay-response')).toBeVisible();
        expect(await panel.locator('.replay-output code').textContent()).toBe(completeStdout(displayedRun(runId)));
        expect(await panel.locator('.replay-response').evaluate((element) => element.getAnimations().length)).toBe(0);
        if (mode === 'print' || mode === 'read') {
          expect(await panel.locator('.replay-output').evaluate((element) =>
            element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
          const finalLine = panel.locator('.replay-output .code-line').last();
          await finalLine.scrollIntoViewIfNeeded();
          await expect(finalLine).toBeInViewport();
        }
        if (mode === 'read') {
          await expect(page.locator(`#${id} .notes a[href*="/replays/"]`).first())
            .toHaveAttribute('href', displayedRun(runId).stdout);
        }
      }
    });
  }
}

test('prompt-free command/output copy and one bottom-aligned output scroller stay accessible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One keyboard/wide-body fixture suffices.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, 'runtime-wait');
  const terminal = page.locator('#runtime-wait [data-cli-replay]');
  const command = terminal.locator('.replay-command code');
  const copied = await command.evaluate((code) => {
    const range = document.createRange();
    range.selectNodeContents(code);
    return range.toString();
  });
  expect(copied).toBe(await command.textContent());
  expect(copied.trim().length).toBeGreaterThan(0);
  expect(copied).not.toContain('$');
  const pre = terminal.locator('.replay-output');
  await expect(pre).toHaveAttribute('role', 'region');
  await expect(pre).toHaveAttribute('tabindex', '0');
  await expect(terminal.locator('.replay-cue, .replay-excerpt')).toHaveCount(0);
  await expect(page.locator('#replay-status')).toHaveAttribute('aria-live', 'polite');
  const status = await page.locator('#replay-status').boundingBox();
  expect(status!.width).toBeLessThanOrEqual(1);
  expect(status!.height).toBeLessThanOrEqual(1);
  const fixture = 'required-output-'.repeat(90);
  await pre.evaluate((element, text) => {
    element.setAttribute('data-preserve-layout', '');
    const line = document.createElement('span');
    line.className = 'code-line';
    line.textContent = text;
    element.querySelector('code')!.replaceChildren(line);
  }, fixture);
  const header = await terminal.locator('figcaption').boundingBox();
  const geometry = await terminal.evaluate((element) => {
    const body = element.querySelector('.replay-output')!;
    const commandBody = element.querySelector('.replay-command')!;
    return {
      overflow: body.scrollWidth - body.clientWidth,
      bottomGap: element.getBoundingClientRect().bottom - body.getBoundingClientRect().bottom,
      bodyOverflow: getComputedStyle(body).overflowX,
      commandOverflow: getComputedStyle(commandBody).overflowX,
      tokenOverflow: getComputedStyle(body.querySelector('.code-line')!).overflowX,
    };
  });
  expect(geometry.overflow).toBeGreaterThan(1000);
  expect(geometry.bottomGap).toBeLessThanOrEqual(2);
  expect(geometry.bodyOverflow).toBe('auto');
  expect(geometry.commandOverflow).toBe('visible');
  expect(geometry.tokenOverflow).toBe('visible');
  await pre.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => pre.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  expect(await terminal.locator('figcaption').boundingBox()).toEqual(header);
  expect(await pre.locator('code').textContent()).toBe(fixture);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test.describe('honest static no-JavaScript fallback', () => {
  test.use({ javaScriptEnabled: false });
  test('captured commands and outputs remain readable without executing anything', async ({ page }) => {
    await page.goto('');
    for (const [id, runId] of surfaces) {
      const panel = page.locator(`#${id} [data-cli-replay]`);
      await expect(panel.locator('figcaption')).toBeVisible();
      await expect(panel.locator('.replay-response')).toBeVisible();
      expect(await panel.locator('.replay-output code').textContent()).toBe(completeStdout(displayedRun(runId)));
      expect(await panel.locator('.replay-output').evaluate((element) =>
        element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
    }
  });
});
