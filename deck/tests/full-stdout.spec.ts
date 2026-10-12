import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

type RecordedRun = { id: string; command: string; stdout: string; outputLanguage: string };
const runs: RecordedRun[] = JSON.parse(
  readFileSync(resolve('..', 'docs', 'evidence', 'cli-replay.json'), 'utf8')).runs;
const surfaces = [
  ['live-cli', 'docs-search'], ['docs-section', 'docs-section'], ['api-search', 'api-search'],
  ['api-member', 'api-member'], ['runtime-wait', 'runtime-wait'], ['runtime-state', 'runtime-describe'],
  ['runtime-traces', 'runtime-traces'],
] as const;
const normalize = (text: string) => text.replace(/\r\n/g, '\n').replace(/\n$/, '');

test('every displayed full response and Range copy matches its linked immutable stdout and command format', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('?mode=present');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  let jsonResponses = 0;
  for (const [id, runId] of surfaces) {
    const run = runs.find((record) => record.id === runId)!;
    const response = await page.request.get(run.stdout);
    expect(response.status()).toBe(200);
    const expected = normalize(await response.text());
    expect(expected).toBe(normalize(readFileSync(resolve('public', 'replays', run.stdout.split('/').at(-1)!), 'utf8')));
    await page.evaluate((slideId) => { location.hash = `/${slideId}`; }, id);
    const panel = page.locator(`#${id} [data-cli-replay]`);
    const output = panel.locator('.replay-output code');
    expect(await panel.locator('.replay-command code').textContent()).toBe(run.command);
    expect(await output.textContent()).toBe(expected);
    const copied = await output.evaluate((code) => {
      const range = document.createRange();
      range.selectNodeContents(code);
      return range.toString();
    });
    expect(copied).toBe(expected);
    expect(copied.endsWith(expected.slice(-30))).toBe(true);
    if (run.command.includes('--format Json')) {
      jsonResponses++;
      await expect(output).toHaveAttribute('data-language', 'json');
      const value = JSON.parse(copied);
      expect(value).toEqual(JSON.parse(expected));
      if (runId === 'docs-search') expect(value).toHaveLength(5);
      if (runId === 'api-search') expect(value).toHaveLength(1);
      if (runId === 'runtime-describe') {
        expect(value.resources).toHaveLength(6);
        expect(value.resources.some((resource: { healthStatus: string }) => resource.healthStatus === 'Unhealthy')).toBe(true);
      }
      if (runId === 'runtime-traces') {
        expect(value).toHaveLength(2);
        expect(value.map((trace: { spans: unknown[] }) => trace.spans.length)).toEqual([1, 4]);
      }
      if (runId === 'docs-section' || runId === 'api-member') {
        expect(typeof value.content).toBe('string');
        expect(value.content).toContain('## ');
        expect(copied).toContain('"content": "');
        expect(copied).toContain('\\n');
        expect(copied).not.toMatch(/^## /);
      }
    } else await expect(output).toHaveAttribute('data-language', 'plaintext');
  }
  expect(jsonResponses).toBe(6);
});

for (const theme of ['light', 'dark'] as const) {
  test(`all seven ${theme} panels have no visible status or excerpt row and no reserved gap`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit full-response theme geometry runs once.');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'no-preference' });
    for (const [id] of surfaces) {
      await page.goto(`?theme=${theme}&mode=present#/${id}`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      await page.evaluate(() => document.fonts.ready);
      const panel = page.locator(`#${id} [data-cli-replay]`);
      await expect(panel.locator('.replay-cue, .replay-excerpt')).toHaveCount(0);
      await expect(panel.locator('.replay-response')).toBeHidden();
      const initial = await panel.evaluate((element) => ({
        bottom: element.getBoundingClientRect().bottom,
        commandBottom: element.querySelector('.replay-command-line')!.getBoundingClientRect().bottom,
      }));
      expect(initial.bottom - initial.commandBottom).toBeGreaterThanOrEqual(0);
      expect(initial.bottom - initial.commandBottom).toBeLessThanOrEqual(2);
      await page.locator('#next').click();
      await expect(panel).toHaveAttribute('data-replay-phase', 'complete');
      const complete = await panel.evaluate((element) => {
        const command = element.querySelector('.replay-command-line')!.getBoundingClientRect();
        const body = element.querySelector('.replay-output')!.getBoundingClientRect();
        return { gap: body.top - command.bottom,
          bottomGap: element.getBoundingClientRect().bottom - body.bottom,
          outside: [...element.children].filter((child) =>
            getComputedStyle(child).display !== 'none').map((child) => child.className || child.tagName) };
      });
      expect(complete.gap).toBeGreaterThanOrEqual(-1);
      expect(complete.gap).toBeLessThanOrEqual(1);
      expect(complete.bottomGap).toBeLessThanOrEqual(2);
      expect(complete.outside).toEqual(['FIGCAPTION', 'replay-command-line', 'replay-response']);
      await expect(panel.locator('figcaption')).toContainText('Recorded CLI run');
      const path = testInfo.outputPath(`${id}-${theme}-full-stdout.png`);
      await page.screenshot({ path });
      await testInfo.attach(`${id}-${theme}-full-stdout`, { path, contentType: 'image/png' });
    }
  });

  test(`only the full output scrolls to its last line by real keyboard and wheel in ${theme}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit keyboard/wheel/theme scroller matrix runs once.');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    for (const [id, runId] of surfaces) {
      await page.goto(`?theme=${theme}&mode=present#/${id}`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      await page.evaluate(() => document.fonts.ready);
      const panel = page.locator(`#${id} [data-cli-replay]`);
      const body = panel.locator('.replay-output');
      const header = await panel.locator('figcaption').boundingBox();
      const command = await panel.locator('.replay-command-line').boundingBox();
      const geometry = await panel.evaluate((element) => {
        const body = element.querySelector('.replay-output')!;
        return {
          height: body.clientHeight, overflow: body.scrollHeight - body.clientHeight,
          horizontal: body.scrollWidth - body.clientWidth, font: parseFloat(getComputedStyle(body).fontSize),
          scrollOwners: [...element.querySelectorAll<HTMLElement>('*'), element].filter((child) =>
            ['auto', 'scroll'].includes(getComputedStyle(child).overflowY) ||
            ['auto', 'scroll'].includes(getComputedStyle(child).overflowX)).map((child) => child.className),
        };
      });
      expect(geometry.horizontal).toBeLessThanOrEqual(1);
      expect(geometry.height).toBeLessThanOrEqual(330);
      expect(geometry.font).toBeGreaterThanOrEqual(22);
      expect(geometry.scrollOwners).toEqual(['replay-output']);
      if (runId !== 'runtime-wait') {
        expect(geometry.overflow).toBeGreaterThan(0);
        await body.focus();
        await page.keyboard.press('ArrowDown');
        await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        await page.keyboard.press('End');
        await expect.poll(() => body.evaluate((element) =>
          element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThanOrEqual(1);
        expect(await panel.locator('figcaption').boundingBox()).toEqual(header);
        expect(await panel.locator('.replay-command-line').boundingBox()).toEqual(command);
        await expect(body.locator('.code-line').last()).toBeInViewport();
        await page.keyboard.press('Home');
        await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBe(0);
        await body.hover();
        await page.mouse.wheel(0, 50_000);
        await expect.poll(() => body.evaluate((element) =>
          element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThanOrEqual(1);
        expect(await panel.locator('figcaption').boundingBox()).toEqual(header);
        expect(await panel.locator('.replay-command-line').boundingBox()).toEqual(command);
        const ending = await body.evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element.querySelector('.code-line:last-child')!);
          return { bottom: range.getBoundingClientRect().bottom, bodyBottom: element.getBoundingClientRect().bottom };
        });
        expect(ending.bottom).toBeLessThanOrEqual(ending.bodyBottom + 1);
      } else expect(geometry.overflow).toBe(0);
      expect(await panel.locator('.replay-response').evaluate((element) => element.scrollTop)).toBe(0);
      expect(await panel.evaluate((element) => element.scrollTop)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

test('touch reading can scroll the complete JSON envelope without an internal hidden result', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'A real browser touch gesture is exercised in the mobile project.');
  await page.goto('?theme=dark&mode=read#/api-member');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const output = page.locator('#api-member .replay-output');
  expect(await output.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  const start = await page.locator('#presentation').evaluate((element) => element.scrollTop);
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 620 }] });
    for (const y of [560, 490, 420, 350, 280, 210, 140]) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y }] });
      await page.waitForTimeout(32);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => page.locator('#presentation').evaluate((element) => element.scrollTop)).toBeGreaterThan(start);
    const lastLine = output.locator('.code-line').last();
    await lastLine.scrollIntoViewIfNeeded();
    await expect(lastLine).toBeInViewport();
    expect(await output.evaluate((element) => element.scrollTop)).toBe(0);
  } finally {
    await session.detach();
  }
});
