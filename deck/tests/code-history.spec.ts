import { expect, test, type Page } from '@playwright/test';

type State = { slide: string; counter: string; hash: string; lines: number[] };

async function state(page: Page): Promise<State> {
  return page.evaluate(() => ({
    slide: document.querySelector('.slides section.present')!.id,
    counter: document.querySelector('#slide-position')!.textContent!,
    hash: location.hash,
    lines: [...document.querySelectorAll<HTMLElement>('.present .code-line.is-focused')]
      .map((line) => Number(line.dataset.line)),
  }));
}

for (const method of ['toolbar', 'keyboard', 'history'] as const) {
  test(`${method} returns through the complete code walkthrough and leaves its initial state for the preceding slide`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Actual two desktop themes exercise presentation controls; mobile retains natural reading.');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const [previous, id, next, counter, second] of [
      ['index', 'parser', 'lexical', '24 / 41', [7, 8, 9]],
      ['compiler', 'lifecycle', 'the-loop', '27 / 41', [7, 8, 9, 10, 11, 12]],
    ] as const) {
      await page.goto(`?mode=present#/${previous}`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      await page.evaluate((id) => { location.hash = `/${id}`; }, id);
      await expect.poll(() => state(page)).toEqual({ slide: id, counter, hash: `#/${id}`, lines: [] });
      const trace = [];
      for (let index = 0; index < 3; index++) {
        if (method === 'keyboard') {
          await page.locator('#presentation').focus();
          await page.keyboard.press('ArrowRight');
        } else await page.locator('#next').click();
        await expect(page.locator('.slides section.present')).toHaveAttribute('id', index < 2 ? id : next);
        trace.push(await state(page));
      }
      for (const [index, lines] of [[0, [...second]], [1, [1, 2, 3, 4, 5]], [2, []]] as const) {
        if (method === 'history') await page.goBack();
        else if (method === 'keyboard') await page.keyboard.press('ArrowLeft');
        else await page.locator('#previous').click();
        await expect.poll(() => state(page)).toEqual({
          slide: id, counter, hash: index === 2 ? `#/${id}` : `#/${id}/${1 - index}`, lines: [...lines],
        });
        trace.push(await state(page));
      }
      if (method === 'history') await page.goBack();
      else if (method === 'keyboard') await page.keyboard.press('ArrowLeft');
      else await page.locator('#previous').click();
      await expect(page.locator('.slides section.present')).toHaveAttribute('id', previous);
      expect((await state(page)).lines).toEqual([]);
      trace.push(await state(page));
      await testInfo.attach(`${id}-${method}-complete-back-navigation`, {
        body: JSON.stringify(trace, null, 2), contentType: 'application/json',
      });
      if (method === 'history') {
        await page.goForward();
        await expect.poll(() => state(page)).toEqual({ slide: id, counter, hash: `#/${id}`, lines: [] });
        await page.goForward();
        await expect.poll(() => state(page)).toEqual({ slide: id, counter, hash: `#/${id}/0`, lines: [1, 2, 3, 4, 5] });
      }
    }
  });
}

for (const interaction of ['pointer copy', 'non-scrolling code body'] as const) {
  test(`${interaction} does not trap backward keyboard navigation after the complete code walkthrough`, async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'One real pointer/focus regression per interaction suffices.');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('?mode=present#/lifecycle/1');
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(page.locator('#apphost-code .is-focused')).toHaveCount(6);
    if (interaction === 'pointer copy') {
      await page.locator('#lifecycle .copy-code').click();
      await expect(page.locator('#deck-status')).toContainText('copied');
    } else {
      const pre = page.locator('#apphost-code').locator('..');
      expect(await pre.evaluate((node) => node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)).toBe(false);
      await pre.click();
    }
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => state(page)).toEqual({
      slide: 'lifecycle', counter: '27 / 41', hash: '#/lifecycle/0', lines: [1, 2, 3, 4, 5],
    });
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => state(page)).toEqual({
      slide: 'lifecycle', counter: '27 / 41', hash: '#/lifecycle', lines: [],
    });
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.slides section.present')).toHaveAttribute('id', 'compiler');
  });
}

test('keyboard copy keeps accessible control focus and a genuinely scrollable code body keeps its navigation keys', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One actual keyboard-control and scroll ownership regression suffices.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('?mode=present#/lifecycle/1');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const copy = page.locator('#lifecycle .copy-code');
  await copy.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#deck-status')).toContainText('copied');
  await expect(copy).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/#\/lifecycle\/1$/);
  await page.goto('?mode=present#/api-member/0');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const output = page.locator('#api-member .replay-output');
  await output.click();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => output.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await expect(page).toHaveURL(/#\/api-member\/0$/);
});
