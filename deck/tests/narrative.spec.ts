import { expect, test, type Page } from '@playwright/test';

const slideIds = (page: Page) => page.locator('.slides > section[id]').evaluateAll((slides) => slides.map((slide) => slide.id));

test('core chapter links each target an existing slide in that chapter', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const links = await page.locator('[data-core-chapter]').evaluateAll((nodes) => nodes.map((node) => ({
    chapter: node.getAttribute('data-core-chapter'), target: node.getAttribute('href')!.replace('#/', ''),
  })));
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    await expect(page.locator(`section#${link.target}`)).toHaveAttribute('data-chapter', link.chapter!);
  }
});

test('every slide has speaker notes and appendices follow the main talk', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const slides = await page.locator('.slides > section[id]').evaluateAll((sections) => sections.map((section) => ({
    id: section.id, appendix: section.hasAttribute('data-appendix'),
    notes: section.querySelector(':scope > .notes')?.textContent?.trim() ?? '',
  })));
  for (const slide of slides) expect(slide.notes, `${slide.id} is missing speaker notes`).not.toBe('');
  const firstAppendix = slides.findIndex((slide) => slide.appendix);
  if (firstAppendix >= 0) expect(slides.slice(firstAppendix).every((slide) => slide.appendix)).toBe(true);
});

test('plain backward hashes reset steps while explicit fragments and Back restore them', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Presentation steps are tested in both desktop themes; mobile uses complete reading.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('?mode=present');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const id = await page.locator('.slides > section[id]').evaluateAll((sections) =>
    sections.find((section) => section.querySelectorAll('.fragment').length >= 3)!.id);
  await page.goto(`?mode=present#/${id}`);
  await expect(page.locator(`#${id} .fragment.visible`)).toHaveCount(0);
  await page.locator('#next').click();
  await expect(page.locator(`#${id} .fragment.visible`)).toHaveCount(1);
  await page.locator('#previous').click();
  await expect(page.locator(`#${id} .fragment.visible`)).toHaveCount(0);
  await page.goto(`?mode=present#/${id}/2`);
  await expect(page.locator(`#${id} .fragment.visible`)).toHaveCount(3);
  await page.locator('#previous').click();
  await expect(page.locator(`#${id} .fragment.visible`)).toHaveCount(2);
});

for (const mode of ['present', 'read'] as const) {
  test(`core chapter menu links navigate with correct counters in ${mode}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit light/dark/input/mode navigation runs once.');
    for (const theme of ['light', 'dark'] as const) {
      await page.setViewportSize({ width: mode === 'read' ? 390 : 1280, height: mode === 'read' ? 844 : 720 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(`?theme=${theme}&mode=${mode}`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      const ids = await slideIds(page);
      const chapters = await page.locator('[data-core-chapter]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-core-chapter')!));
      for (const chapter of chapters) {
        await page.locator('#menu-toggle').click();
        const link = page.locator(`[data-core-chapter="${chapter}"]`);
        const first = (await link.getAttribute('href'))!.replace('#/', '');
        await link.focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`#/${first}(?:/\\d+)?$`));
        await expect(page.locator(`#${first} h2`)).toBeInViewport();
        await expect(page.locator('#chapter-label')).toHaveText(chapter);
        await expect(page.locator('#slide-position')).toHaveText(`${ids.indexOf(first) + 1} / ${ids.length}`);
        await page.locator('#menu-toggle').click();
        await expect(link).toHaveAttribute('aria-current', 'step');
        expect(await page.locator('[data-core-chapter][aria-current="step"]').count()).toBe(1);
        await page.keyboard.press('Escape');
        await expect(page.locator('#menu-toggle')).toBeFocused();
      }
    }
  });
}
