import { expect, test } from '@playwright/test';

for (const theme of ['light', 'dark'] as const) {
  for (const viewport of [
    { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 390, height: 844 },
  ]) {
    test(`${theme} ${viewport.width}px code bodies wrap and end at their panel bottoms`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit theme/viewport matrix runs once.');
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
      await page.goto('');
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      const sections = await page.locator('.code-panel').evaluateAll((panels) =>
        [...new Set(panels.map((panel) => panel.closest('section')!.id))]);
      let checked = 0;
      for (const id of sections) {
        await page.evaluate((slideId) => { window.location.hash = `/${slideId}`; }, id);
        await expect(page.locator(`#${id} h2`)).toBeInViewport();
        const panels = await page.locator(`#${id} .code-panel`).evaluateAll((elements) =>
          elements.map((panel) => {
            const pre = panel.querySelector('pre')!;
            const code = pre.querySelector('code')!;
            const header = panel.querySelector('figcaption')!;
            const panelRect = panel.getBoundingClientRect();
            const bodyRect = pre.getBoundingClientRect();
            return {
              bodyBottomGap: panelRect.bottom - bodyRect.bottom,
              headerBottom: header.getBoundingClientRect().bottom,
              bodyTop: bodyRect.top,
              bodyOverflow: pre.scrollWidth - pre.clientWidth,
              codeOverflowMode: getComputedStyle(code).overflowX,
              lineOverflowModes: [...new Set([...code.children].map((line) => getComputedStyle(line).overflowX))],
              textLength: code.textContent!.length,
              bodyFont: parseFloat(getComputedStyle(pre).fontSize),
              renderedLines: [...code.children].every((line) => line.getBoundingClientRect().height > 0),
            };
          }));
        for (const panel of panels) {
          expect(panel.bodyBottomGap).toBeGreaterThanOrEqual(-1);
          expect(panel.bodyBottomGap).toBeLessThanOrEqual(2);
          expect(panel.headerBottom).toBeLessThanOrEqual(panel.bodyTop + 1);
          expect(panel.bodyOverflow, `${id} must not need avoidable horizontal scrolling`).toBeLessThanOrEqual(1);
          expect(panel.codeOverflowMode).toBe('visible');
          expect(panel.lineOverflowModes).not.toContain('auto');
          expect(panel.lineOverflowModes).not.toContain('scroll');
          expect(panel.textLength).toBeGreaterThan(20);
          expect(panel.bodyFont).toBeGreaterThanOrEqual(16);
          expect(panel.renderedLines).toBe(true);
          checked++;
        }
      }
      expect(checked).toBe(10);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('#apphost-code')).toContainText('.WithEnvironment("API_HTTPS", "")');
    });
  }
}

test('required wide lines scroll only the body at the rounded panel bottom and remain copyable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One deliberate wide-line fixture is sufficient.');
  await page.goto('#/api-code');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const required = `$opaque = '${'required-unbroken-value-'.repeat(12)}';`;
  await page.locator('#api-code .code-panel').first().evaluate((panel, text) => {
    const pre = panel.querySelector('pre')!;
    pre.dataset.preserveLayout = '';
    const code = pre.querySelector('code')!;
    const line = document.createElement('span');
    line.className = 'code-line';
    line.textContent = text;
    code.replaceChildren(line);
  }, required);
  const panel = page.locator('#api-code .code-panel').first();
  const pre = panel.locator('pre');
  const header = panel.locator('figcaption');
  const before = await header.boundingBox();
  const geometry = await panel.evaluate((element) => {
    const body = element.querySelector('pre')!;
    return {
      overflow: body.scrollWidth - body.clientWidth,
      bottomGap: element.getBoundingClientRect().bottom - body.getBoundingClientRect().bottom,
      headerOverflow: element.querySelector('figcaption')!.scrollWidth - element.querySelector('figcaption')!.clientWidth,
      mode: getComputedStyle(body).overflowX,
    };
  });
  expect(geometry.overflow).toBeGreaterThan(1000);
  expect(geometry.bottomGap).toBeLessThanOrEqual(2);
  expect(geometry.headerOverflow).toBeLessThanOrEqual(1);
  expect(geometry.mode).toBe('auto');
  await expect(pre).toHaveAttribute('tabindex', '0');
  await expect(pre).toHaveAttribute('role', 'region');
  await pre.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => pre.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  expect(await header.boundingBox()).toEqual(before);
  await expect(pre.locator('code')).toHaveText(required);
  expect(await pre.locator('.code-line').evaluate((line) => getComputedStyle(line).overflowX)).toBe('visible');
  await pre.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  const ending = await pre.evaluate((element) => {
    const text = element.querySelector('.code-line')!.firstChild!;
    const range = document.createRange();
    range.setStart(text, text.textContent!.length - 3);
    range.setEnd(text, text.textContent!.length);
    return { end: range.getBoundingClientRect().right, right: element.getBoundingClientRect().right };
  });
  expect(ending.end).toBeLessThanOrEqual(ending.right + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
