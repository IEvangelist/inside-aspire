import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type CapturedRun = {
  id: string; command: string; arguments: string[]; exitCode: number; capturedAt: string;
  stdout: string; stderr: string; publicStdoutSha256: string; publicStderrSha256: string;
  rawStdoutSha256: string; rawStderrSha256: string; outputLanguage: string;
};
const evidence: { cliVersion: string; native: { format: string; clrHeader: boolean; resource: string;
  sha256: string; stoppedAfterCapture: boolean; fixtureProviders: boolean }; runs: CapturedRun[] } =
  JSON.parse(readFileSync(resolve('..', 'docs', 'evidence', 'cli-replay.json'), 'utf8'));
const surfaces = [
  ['live-cli', 'docs-search'], ['docs-section', 'docs-section'], ['api-search', 'api-search'],
  ['api-member', 'api-member'], ['runtime-wait', 'runtime-wait'], ['runtime-state', 'runtime-describe'],
  ['runtime-traces', 'runtime-traces'],
] as const;

function completeStdout(run: CapturedRun): string {
  return readFileSync(resolve('public', 'replays', run.stdout.split('/').at(-1)!), 'utf8')
    .replace(/\r\n/g, '\n').replace(/\n$/, '');
}

async function open(page: Page, id: string, theme = 'dark', mode = 'present') {
  await page.goto(`?theme=${theme}&mode=${mode}#/${id}`);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
}

test('public replay files match capture hashes, exact semantic output, native provenance, and privacy rules', () => {
  expect(evidence.cliVersion).toBe('13.6.1');
  expect(evidence.runs.map((run) => run.id)).toEqual(surfaces.map((surface) => surface[1]));
  expect(evidence.native).toMatchObject({
    format: 'PE32+ x64', clrHeader: false, resource: 'api', stoppedAfterCapture: true, fixtureProviders: false,
  });
  expect(evidence.native.sha256).toMatch(/^[a-f0-9]{64}$/);
  for (const run of evidence.runs) {
    expect(run.exitCode).toBe(0);
    expect(run.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(run.rawStdoutSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(run.rawStderrSha256).toMatch(/^[a-f0-9]{64}$/);
    for (const [url, digest] of [[run.stdout, run.publicStdoutSha256], [run.stderr, run.publicStderrSha256]]) {
      const content = readFileSync(resolve('public', 'replays', url.split('/').at(-1)!));
      expect(createHash('sha256').update(content).digest('hex')).toBe(digest);
      expect(content.toString()).not.toMatch(/\x1b|\b[A-Z]:[\\/]|[?&](?:t|token|api[-_]?key)=/i);
    }
    expect(completeStdout(run).trim().length).toBeGreaterThan(20);
    expect(run.outputLanguage).toBe(run.command.includes('--format Json') ? 'json' : 'plaintext');
    expect(run.arguments).toContain('--non-interactive');
    expect(run.arguments).toContain('--nologo');
    if (run.id === 'api-member') expect(run.arguments).not.toContain('--language');
  }
  const stdout = (id: string) => {
    const run = evidence.runs.find((record) => record.id === id)!;
    return readFileSync(resolve('public', 'replays', run.stdout.split('/').at(-1)!), 'utf8');
  };
  const search = JSON.parse(stdout('docs-search'));
  expect(search[0]).toMatchObject({ title: 'Browser logs', slug: 'browser-logs',
    section: 'Add browser logs to a resource', score: 172.43004 });
  expect(search[0].content).toContain('capture and configure browser console logs');
  expect(search).toHaveLength(5);
  const section = JSON.parse(stdout('docs-section'));
  expect(section.slug).toBe('browser-logs');
  expect(section.content).toContain('without restarting the AppHost');
  const api = JSON.parse(stdout('api-search'));
  expect(api).toHaveLength(1);
  expect(api[0].id).toBe('csharp/aspire.hosting.browsers/browserlogsbuilderextensions/methods#withbrowserlogs');
  expect(JSON.parse(stdout('api-member')).content).toContain('ASPIREBROWSERLOGS001');
  expect(stdout('runtime-wait')).toContain("Resource 'api' is healthy. (0.0s)");
  const resources = JSON.parse(stdout('runtime-describe')).resources;
  expect(resources.find((resource: { displayName: string }) => resource.displayName === 'api')).toMatchObject({
    state: 'Running', healthStatus: 'Healthy', resourceType: 'Executable', source: 'Weather.Api.exe',
  });
  const traces = JSON.parse(stdout('runtime-traces'));
  expect(traces.some((trace: { title: string; hasError: boolean; spans: unknown[] }) =>
    trace.title === 'GET /api/weather' && !trace.hasError && trace.spans.length === 4)).toBe(true);
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
            gap: box.bottom - output.getBoundingClientRect().bottom,
            font: parseFloat(getComputedStyle(output).fontSize) };
        });
        expect(geometry.left).toBeGreaterThanOrEqual(0);
        expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
        expect(geometry.bottom).toBeLessThanOrEqual(viewport.height - 1);
        expect(geometry.overflow).toBeLessThanOrEqual(1);
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
      const record = evidence.runs.find((run) => run.id === runId)!;
      const terminal = page.locator(`#${id} [data-cli-replay]`);
      const command = terminal.locator('.replay-command code');
      const response = terminal.locator('.replay-response');
      await expect(terminal).toHaveAttribute('data-replay-phase', 'command');
      await expect(command).toHaveText(record.command);
      await expect(response).toBeHidden();
      await expect(terminal.locator('figcaption')).toContainText('Recorded CLI run');
      expect(await page.locator('.slides section.present .replay-command:visible').count()).toBe(1);
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
  await page.locator('#next').click();
  await expect(page).toHaveURL(/#\/docs-section$/);
  await expect(page.locator('#docs-section [data-cli-replay]')).toHaveAttribute('data-replay-phase', 'command');
  await expect(page.locator('#docs-section .replay-response')).toBeHidden();
  await page.locator('#previous').click();
  await expect(page.locator('#live-cli [data-cli-replay]')).toHaveAttribute('data-replay-phase', 'complete');
  await page.goto('?mode=present#/api-search/0');
  await expect(page.locator('#api-search [data-cli-replay]')).toHaveAttribute('data-replay-phase', 'complete');
  await expect(page.locator('#api-search .replay-output')).toContainText('csharp/aspire.hosting.browsers');
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
        expect(await panel.locator('.replay-output code').textContent()).toBe(completeStdout(evidence.runs.find((run) => run.id === runId)!));
        expect(await panel.locator('.replay-response').evaluate((element) => element.getAnimations().length)).toBe(0);
        if (mode === 'print' || mode === 'read') {
          expect(await panel.locator('.replay-output').evaluate((element) =>
            element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
          const finalLine = panel.locator('.replay-output .code-line').last();
          await finalLine.scrollIntoViewIfNeeded();
          await expect(finalLine).toBeInViewport();
        }
        if (mode === 'read') {
          const footer = page.locator(`#${id} > .source-line`);
          await footer.scrollIntoViewIfNeeded();
          await expect(footer).toBeInViewport();
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
  expect(copied).toBe(evidence.runs.find((run) => run.id === 'runtime-wait')!.command);
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
      await expect(panel.locator('figcaption')).toContainText('Recorded CLI run');
      await expect(panel.locator('.replay-response')).toBeVisible();
      expect(await panel.locator('.replay-output code').textContent()).toBe(completeStdout(evidence.runs.find((run) => run.id === runId)!));
      expect(await panel.locator('.replay-output').evaluate((element) =>
        element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
    }
  });
});
