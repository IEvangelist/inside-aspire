import { expect, test } from '@playwright/test';

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
        const target = (await start.getAttribute('href'))!.replace(/^#\//, '');
        const order = await page.locator('.slides > section[id]').evaluateAll((slides) => slides.map((slide) => slide.id));
        expect(order).toContain(target);
        if (input === 'pointer') await start.click();
        else {
          await start.focus();
          await page.keyboard.press('Enter');
        }
        await expect(page).toHaveURL(new RegExp(`#/${target}(?:/\\d+)?$`));
        const heading = page.locator(`#${target} > :not(.notes)`).first();
        await expect(heading).toBeInViewport();
        await expect(page.locator('#slide-position')).toHaveText(`${order.indexOf(target) + 1} / ${order.length}`);
        const bounds = await heading.boundingBox();
        const toolbar = await page.locator('.toolbar').boundingBox();
        expect(bounds!.y).toBeGreaterThanOrEqual(toolbar!.y + toolbar!.height - 1);
        await page.locator('#menu-toggle').click();
        const chapter = page.locator('#deck-menu [data-slide]').last();
        const chapterId = (await chapter.getAttribute('data-slide'))!;
        await chapter.click();
        await expect(page).toHaveURL(new RegExp(`#/${chapterId}(?:/\\d+)?$`));
        await expect(page.locator(`#${chapterId} > :not(.notes)`).first()).toBeInViewport();
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
          const fit = Math.min(bounds.width / element.naturalWidth, bounds.height / element.naturalHeight);
          const paintedWidth = element.naturalWidth * fit;
          const paintedHeight = element.naturalHeight * fit;
          return {
            width: element.clientWidth, height: element.clientHeight, outerWidth: bounds.width,
            right: bounds.right, bottom: bounds.bottom,
            parentWidth: parent.width, ratio: element.naturalWidth / element.naturalHeight,
            paintedArea: paintedWidth * paintedHeight,
            boxArea: bounds.width * bounds.height,
          };
        });
        expect(Math.abs(geometry.width / geometry.height - geometry.ratio)).toBeLessThan(0.01);
        expect(geometry.paintedArea / geometry.boxArea).toBeGreaterThanOrEqual(0.99);
        expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
        if (viewport.mode === 'present') expect(geometry.bottom).toBeLessThan(viewport.height - 1);
        if (id === 'weather') {
          if (viewport.mode === 'read') expect(geometry.outerWidth).toBeGreaterThanOrEqual(geometry.parentWidth - 1);
          if (viewport.width === 1280) {
            const path = testInfo.outputPath(`weather-${theme}.png`);
            await page.screenshot({ path });
            await testInfo.attach('larger-actual-weather-content', { path, contentType: 'image/png' });
          }
        } else expect(geometry.outerWidth).toBeGreaterThanOrEqual(geometry.parentWidth - 1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

test('audience command text is directly copyable Aspire CLI with verified identities', async ({ page }) => {
  await page.goto('#/live-cli');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const codes = page.locator('.replay-command code');
  const commands = (await codes.allTextContents()).join('\n');
  expect(commands.length).toBeGreaterThan(0);
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
  for (const command of selected.split('\n').filter((line) => /^\S/.test(line))) expect(command).toMatch(/^aspire /);
});

test('three-area audience surfaces render coherently in one desktop/mobile visual batch', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One bounded desktop/mobile/theme capture batch is sufficient.');
  test.setTimeout(240_000);
  for (const layout of [
    { width: 1280, height: 720, theme: 'dark', mode: 'present' },
    { width: 390, height: 844, theme: 'light', mode: 'read' },
  ]) {
    await page.setViewportSize(layout);
    await page.emulateMedia({ colorScheme: layout.theme === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    await page.goto(`?theme=${layout.theme}&mode=${layout.mode}`);
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await page.evaluate(() => document.fonts.ready);
    const ids = await page.locator('.slides > section[id]').evaluateAll((slides) => slides.map((slide) => slide.id));
    for (const id of ids) {
      await page.evaluate((slideId) => { location.hash = `/${slideId}`; }, id);
      const slide = page.locator(`#${id}`);
      if (layout.mode === 'present') await expect(slide).toHaveClass(/present/);
      else await slide.scrollIntoViewIfNeeded();
      await expect(slide).toBeVisible();
      const path = testInfo.outputPath(`${id}-${layout.width}-${layout.theme}.png`);
      await slide.screenshot({ path });
      await testInfo.attach(`${id}-${layout.width}-${layout.theme}`, { path, contentType: 'image/png' });
    }
  }
});
