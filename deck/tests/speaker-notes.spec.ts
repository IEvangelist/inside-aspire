import { expect, test, type Page } from '@playwright/test';

async function audience(page: Page) {
  await page.goto('?theme=dark#/lifecycle');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
}

test('native speaker console connects real current/upcoming frames, original notes and timer through a full code rewind', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One actual native presenter connection, not a mock, suffices.');
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await audience(page);
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
    const currentFrame = popup.frames().find((frame) => frame.url().includes('postMessageEvents=true'))!;
    const upcomingFrame = popup.frames().find((frame) => frame.url().includes('controls=false'))!;
    for (const frame of [currentFrame, upcomingFrame]) {
      const url = new URL(frame.url());
      expect(url.searchParams.has('receiver')).toBe(true);
      expect(url.searchParams.get('history')).toBe('false');
      expect(url.searchParams.get('scrollActivationWidth')).toBe('false');
    }
    await expect(popup.locator('.speaker-controls-notes .value')).toHaveText(
      await page.locator('#lifecycle > .notes').textContent() ?? '');
    await expect(popup.locator('.speaker-controls-time .clock-value')).not.toHaveText('0:00 AM');
    const seconds = await popup.locator('.timer .seconds-value').textContent();
    await expect.poll(() => popup.locator('.timer .seconds-value').textContent()).not.toBe(seconds);
    for (let index = 0; index < 3; index++) {
      await page.locator('#next').click();
      const id = index < 2 ? 'lifecycle' : 'the-loop';
      await expect(current.locator('.slides section.present')).toHaveAttribute('id', id);
      if (index < 2) {
        await expect(current.locator('#apphost-code .is-focused')).toHaveCount(index === 0 ? 5 : 6);
        await expect(upcoming.locator('.slides section.present')).toHaveAttribute('id', index === 0 ? 'lifecycle' : 'the-loop');
        await expect(upcoming.locator('.present .is-focused')).toHaveCount(index === 0 ? 6 : 0);
      }
      await expect(popup.locator('.speaker-controls-notes .value')).toHaveText(
        await page.locator(`#${id} > .notes`).textContent() ?? '');
    }
    for (const [id, count] of [['lifecycle', 6], ['lifecycle', 5], ['lifecycle', 0], ['compiler', 0]] as const) {
      await page.locator('#previous').click();
      await expect(current.locator('.slides section.present')).toHaveAttribute('id', id);
      await expect(current.locator(`#${id} .is-focused`)).toHaveCount(count);
      await expect(popup.locator('.speaker-controls-notes .value')).toHaveText(
        await page.locator(`#${id} > .notes`).textContent() ?? '');
    }
    await popup.bringToFront();
    await expect.poll(() => new URL(currentFrame.url()).hash).toBe('#/compiler/2');
    await currentFrame.evaluate(() => location.reload());
    await expect(current.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(current.locator('.slides section.present')).toHaveAttribute('id', 'compiler');
    expect(new URL(currentFrame.url()).searchParams.has('receiver')).toBe(true);
    for (const [key, id, count] of [
      ['ArrowRight', 'lifecycle', 0], ['ArrowRight', 'lifecycle', 5], ['ArrowRight', 'lifecycle', 6],
      ['ArrowLeft', 'lifecycle', 5], ['ArrowLeft', 'lifecycle', 0], ['ArrowLeft', 'compiler', 0],
    ] as const) {
      await popup.keyboard.press(key);
      await expect(page.locator('.slides section.present')).toHaveAttribute('id', id);
      await expect(page.locator(`#${id} .is-focused`)).toHaveCount(count);
      await expect(current.locator('.slides section.present')).toHaveAttribute('id', id);
      await expect(popup.locator('.speaker-controls-notes .value')).toHaveText(
        await page.locator(`#${id} > .notes`).textContent() ?? '');
    }
    await page.evaluate(() => { location.hash = '/lifecycle'; });
    await expect(current.locator('.slides section.present')).toHaveAttribute('id', 'lifecycle');
    await page.locator('#next').click();
    await page.locator('#next').click();
    await page.goBack();
    await expect(current.locator('#apphost-code .is-focused')).toHaveCount(5);
    await page.goBack();
    await expect(page).toHaveURL(/#\/lifecycle$/);
    await expect(current.locator('#apphost-code .is-focused')).toHaveCount(0);
    await expect(page.locator('aside.notes:visible')).toHaveCount(0);
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
  await page.goto('?theme=light&mode=read#/parser');
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
    await expect(current.locator('.slides section.present')).toHaveAttribute('id', 'parser');
    await expect(popup.locator('.speaker-controls-notes .value')).toContainText('0:30-0:31.');
    await expect(page.locator('html')).toHaveAttribute('data-reading', 'true');
  } finally {
    await popup.close();
  }
});
