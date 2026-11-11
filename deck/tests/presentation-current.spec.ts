import { expect, test, type Page } from '@playwright/test';
import { completeStdout, displayedRun } from './replay-fixtures';

async function open(page: Page, id: string) {
  await page.goto(`?mode=present#/${id}`);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
}

test('chapter openers show complete loops and the three requested takeaways', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit chapter-content check runs once.');
  await open(page, 'ai-loops');
  const tracks = page.locator('#ai-loops .chapter-track');
  await expect(tracks.locator('h3')).toHaveText(['Product', 'Aspire docs', 'Your app']);
  const steps = await tracks.locator('.chapter-flow').evaluateAll((flows) =>
    flows.map((flow) => [...flow.querySelectorAll('strong')].map((step) => step.textContent)));
  expect(steps).toEqual([
    ['Feature', 'AI change', 'Test + review', 'Merge'],
    ['Feature PR', 'AI draft', 'Human edit', 'Publish'],
    ['Inspect', 'AI edit', 'Run', 'Verify'],
  ]);
  await expect(tracks.locator('.chapter-repeat svg')).toHaveCount(3);
  await expect(page.locator('#ai-loops > .chapter-payoff')).toHaveCount(0);
  await open(page, 'takeaways');
  await expect(page.locator('#takeaways [data-takeaway]')).toHaveText([
    'Aspire makes AI more efficient.',
    'Aspire improves the dev inner loop.',
    'Aspire carries one app model into deployment.',
  ]);
});

test('default and chapter transitions visibly animate both outgoing and incoming slides', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Actual transition geometry is checked once.');
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [from, to] of [
    ['intro', 'setup'], ['setup', 'thesis'], ['the-loop', 'dashboard'], ['deployment', 'deployment-model'],
  ]) {
    await open(page, from);
    await page.waitForFunction(() => document.querySelector('.slides > section.present')!
      .getAnimations().every((animation) => animation.playState !== 'running'));
    const allTransitions = await page.locator('.slides > section[id]').evaluateAll((slides) =>
      slides.map((slide) => slide.getAttribute('data-transition')));
    expect(allTransitions).toHaveLength(43);
    expect(allTransitions.every((transition) => transition && transition !== 'none')).toBe(true);
    const result = await page.evaluate(async ({ from, to }) => {
      const outgoing = document.getElementById(from)!;
      const incoming = document.getElementById(to)!;
      const snapshot = (slide: HTMLElement) => {
        const style = getComputedStyle(slide);
        const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
        return { display: style.display, opacity: Number(style.opacity), x: matrix.m41,
          running: slide.getAnimations().filter((animation) => animation.playState === 'running').length };
      };
      snapshot(outgoing);
      snapshot(incoming);
      let presses = 0;
      while (document.querySelector('.slides > section.present')?.id === from && presses++ < 50) {
        document.getElementById('next')!.click();
      }
      if (document.querySelector('.slides > section.present')?.id !== to) {
        throw new Error(`Unexpected transition from ${from}; expected ${to}.`);
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const start = [snapshot(outgoing), snapshot(incoming)];
      await new Promise((resolve) => setTimeout(resolve, 100));
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      return { start, middle: [snapshot(outgoing), snapshot(incoming)] };
    }, { from, to });
    for (let side = 0; side < 2; side++) {
      const start = result.start[side];
      const middle = result.middle[side];
      expect(start.display).not.toBe('none');
      expect(start.running).toBeGreaterThan(0);
      expect(middle.running).toBeGreaterThan(0);
      expect(Math.abs(start.x - middle.x) > 1 || Math.abs(start.opacity - middle.opacity) > 0.01).toBe(true);
    }
    if (from === 'intro') {
      expect(result.start[0].display).toBe('grid');
      expect(result.middle[0].display).toBe('grid');
    }
  }
});

test('Compose terminal timelines preserve exact output, color and column alignment', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Both recorded timeline surfaces are checked once.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [slideId, runId] of [['deployment-publish', 'compose-publish'], ['deployment-deploy', 'compose-deploy']]) {
    await open(page, slideId);
    const output = page.locator(`#${slideId} .replay-output`);
    await expect(output).toHaveAttribute('data-preserve-layout', '');
    await expect(output.locator('code')).toHaveText(completeStdout(displayedRun(runId)));
    const styling = await output.evaluate((element) => {
      const colors = ['.hljs-title', '.hljs-string', '.hljs-meta'].map((selector) => {
        const token = element.querySelector<HTMLElement>(selector);
        if (!token) throw new Error(`Missing terminal token ${selector}.`);
        return getComputedStyle(token).color;
      });
      const columns = [...element.querySelectorAll<HTMLElement>('.terminal-row')]
        .filter((row) => row.textContent?.includes('│'))
        .map((row) => {
          const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            const index = node.textContent!.indexOf('│');
            if (index >= 0) {
              const range = document.createRange();
              range.setStart(node, index);
              range.setEnd(node, index + 1);
              return range.getBoundingClientRect().left;
            }
          }
          throw new Error('Timeline row has no column boundary.');
        });
      return { colors, columns, checkmarks: element.querySelectorAll('.terminal-cell').length };
    });
    expect(new Set(styling.colors).size).toBe(3);
    expect(styling.checkmarks).toBeGreaterThan(0);
    expect(styling.columns.length).toBeGreaterThan(5);
    expect(Math.max(...styling.columns) - Math.min(...styling.columns)).toBeLessThanOrEqual(1);
  }
});
