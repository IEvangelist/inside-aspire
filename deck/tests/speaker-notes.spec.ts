import { expect, test, type Page } from '@playwright/test';

async function audience(page: Page) {
  await page.goto('?theme=dark');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
}

const presentId = (page: Page) => page.locator('.slides > section.present').getAttribute('id');

test('native speaker console connects real current/upcoming frames, original notes, timer and code steps', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One actual native presenter connection, not a mock, suffices.');
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await audience(page);
  const codeSlide = await page.locator('.slides > section[id]:has(.code-step)').first().getAttribute('id');
  await page.evaluate((id) => { location.hash = `/${id}`; }, codeSlide);
  await expect(page.locator(`#${codeSlide}`)).toHaveClass(/present/);
  await page.locator('#menu-toggle').click();
  const popupEvent = page.waitForEvent('popup');
  await page.locator('#notes').click();
  const popup = await popupEvent;
  try {
    await expect(popup).toHaveTitle('reveal.js - Speaker View');
    const current = popup.frameLocator('#current-slide iframe');
    const upcoming = popup.frameLocator('#upcoming-slide iframe');
    await expect(current.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(upcoming.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(popup.locator('#connection-status')).toBeHidden();
    await expect(current.locator('html')).toHaveAttribute('data-reading', 'false');
    await expect(upcoming.locator('html')).toHaveAttribute('data-reading', 'false');
    await expect(current.locator('.toolbar')).toBeHidden();
    await expect(upcoming.locator('.toolbar')).toBeHidden();
    for (const frame of popup.frames().filter((frame) => frame.url().includes('receiver'))) {
      const url = new URL(frame.url());
      expect(url.searchParams.get('history')).toBe('false');
      expect(url.searchParams.get('scrollActivationWidth')).toBe('false');
    }
    await expect(popup.locator('.speaker-controls-time .clock-value')).not.toHaveText('0:00 AM');
    const seconds = await popup.locator('.timer .seconds-value').textContent();
    await expect.poll(() => popup.locator('.timer .seconds-value').textContent()).not.toBe(seconds);
    const expectSynced = async () => {
      const id = await presentId(page);
      await expect(current.locator('.slides section.present')).toHaveAttribute('id', id!);
      const focused = await page.locator(`#${id} .is-focused`).evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLElement).dataset.line));
      await expect.poll(() => current.locator(`#${id} .is-focused`).evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLElement).dataset.line))).toEqual(focused);
      await expect(popup.locator('.speaker-controls-notes .value')).toHaveText(
        await page.locator(`#${id} > .notes`).textContent() ?? '');
    };
    await expectSynced();
    for (let index = 0; index < 3; index++) {
      await page.locator('#next').click();
      await expect(page.locator(`#${codeSlide} .is-focused`).first()).toBeAttached();
      await expectSynced();
    }
    for (let index = 0; index < 4; index++) {
      await page.locator('#previous').click();
      await expectSynced();
    }
    await popup.bringToFront();
    for (const key of ['ArrowRight', 'ArrowRight', 'ArrowLeft']) {
      const before = page.url();
      await popup.keyboard.press(key);
      await expect.poll(() => page.url()).not.toBe(before);
      await expectSynced();
    }
  } finally {
    await popup.close();
  }
});
test('the S shortcut opens the native presenter and a blocked popup surfaces an actionable error', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One explicit shortcut/blocked-popup path suffices.');
  await audience(page);
  await page.locator('#presentation').focus();
  const opened = page.waitForEvent('popup');
  await page.keyboard.press('s');
  const popup = await opened;
  await expect(popup).toHaveTitle('reveal.js - Speaker View');
  await popup.close();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await page.evaluate(() => { window.open = () => null; });
  await page.locator('#presentation').focus();
  await page.keyboard.press('s');
  await expect(page.locator('#deck-status')).toContainText('Allow pop-ups');
});

test('speaker preview receivers stay in presentation mode when the audience opened notes from natural reading', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One real read-to-native-presenter receiver path suffices.');
  await page.goto('?theme=light&mode=read');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const id = await page.locator('.slides > section[id]').nth(2).getAttribute('id');
  await page.goto(`?theme=light&mode=read#/${id}`);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await page.locator('#menu-toggle').click();
  const opened = page.waitForEvent('popup');
  await page.locator('#notes').click();
  const popup = await opened;
  try {
    const current = popup.frameLocator('#current-slide iframe');
    const upcoming = popup.frameLocator('#upcoming-slide iframe');
    await expect(current.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(upcoming.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(current.locator('html')).toHaveAttribute('data-reading', 'false');
    await expect(upcoming.locator('html')).toHaveAttribute('data-reading', 'false');
    await expect(current.locator('.slides section.present')).toHaveAttribute('id', id!);
    await expect(popup.locator('.speaker-controls-notes .value')).toHaveText(await page.locator(`#${id} > .notes`).textContent() ?? '');
    await expect(page.locator('html')).toHaveAttribute('data-reading', 'true');
  } finally {
    await popup.close();
  }
});
