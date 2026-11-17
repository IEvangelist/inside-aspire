import { expect, test, type Page } from '@playwright/test';

type State = { slide: string; counter: string; hash: string; lines: string[] };

async function state(page: Page): Promise<State> {
  return page.evaluate(() => ({
    slide: document.querySelector('.slides section.present')!.id,
    counter: document.querySelector('#slide-position')!.textContent!,
    hash: location.hash,
    lines: [...document.querySelectorAll<HTMLElement>('.present .code-line.is-focused')]
      .map((line) => `${line.closest('code')!.id}:${line.dataset.line}`),
  }));
}

// The first code-walk slide whose fragments focus code lines, with its neighbours.
async function codeWalk(page: Page) {
  await page.goto('?mode=present');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  return page.evaluate(() => {
    const slides = [...document.querySelectorAll<HTMLElement>('.slides > section')];
    const index = slides.findIndex((slide) => slide.querySelector('.code-panel .code-line')
      && slide.querySelectorAll('.fragment').length > 1);
    return {
      previous: slides[index - 1].id, id: slides[index].id, next: slides[index + 1].id,
      steps: slides[index].querySelectorAll('.fragment').length,
    };
  });
}

for (const method of ['toolbar', 'keyboard', 'history'] as const) {
  test(`${method} returns through the complete code walkthrough and leaves its initial state for the preceding slide`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Actual two desktop themes exercise presentation controls; mobile retains natural reading.');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const { previous, id, next, steps } = await codeWalk(page);
    await page.goto(`?mode=present#/${previous}`);
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await page.evaluate((id) => { location.hash = `/${id}`; }, id);
    await expect.poll(async () => (await state(page)).slide).toBe(id);
    const initial = await state(page);
    expect(initial.lines).toEqual([]);
    const forward: State[] = [];
    for (let index = 0; index <= steps; index++) {
      if (method === 'keyboard') {
        await page.locator('#presentation').focus();
        await page.keyboard.press('ArrowRight');
      } else await page.locator('#next').click();
      await expect(page.locator('.slides section.present')).toHaveAttribute('id', index < steps ? id : next);
      if (index < steps) {
        await expect.poll(async () => (await state(page)).hash).toBe(`#/${id}/${index}`);
        const current = await state(page);
        expect(current.lines.length).toBeGreaterThan(0);
        expect(current.counter).toBe(initial.counter);
        forward.push(current);
      }
    }
    for (let index = steps - 1; index >= -1; index--) {
      if (method === 'history') await page.goBack();
      else if (method === 'keyboard') await page.keyboard.press('ArrowLeft');
      else await page.locator('#previous').click();
      await expect.poll(() => state(page)).toEqual(index >= 0 ? forward[index] : initial);
    }
    if (method === 'history') await page.goBack();
    else if (method === 'keyboard') await page.keyboard.press('ArrowLeft');
    else await page.locator('#previous').click();
    await expect(page.locator('.slides section.present')).toHaveAttribute('id', previous);
    if (method === 'history') {
      await page.goForward();
      await expect.poll(() => state(page)).toEqual(initial);
      await page.goForward();
      await expect.poll(() => state(page)).toEqual(forward[0]);
    }
  });
}

async function activeCopy(page: Page) {
  return page.locator('.present .code-panel.is-active .copy-code');
}

for (const interaction of ['pointer copy', 'non-scrolling code body'] as const) {
  test(`${interaction} does not trap backward keyboard navigation after the complete code walkthrough`, async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'One real pointer/focus regression per interaction suffices.');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 1280, height: 720 });
    const { previous, id } = await codeWalk(page);
    await page.goto(`?mode=present#/${id}/1`);
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(page.locator('.present .code-line.is-focused').first()).toBeVisible();
    if (interaction === 'pointer copy') {
      const copy = await activeCopy(page);
      await copy.click();
      await expect(copy).toHaveClass(/is-copied/);
    } else {
      const pre = page.locator('.present .code-panel.is-active pre');
      expect(await pre.evaluate((node) => node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)).toBe(false);
      await pre.click();
    }
    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(new RegExp(`#/${id}/0$`));
    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(new RegExp(`#/${id}$`));
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.slides section.present')).toHaveAttribute('id', previous);
  });
}

test('keyboard copy keeps accessible control focus and a genuinely scrollable code body keeps its navigation keys', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One actual keyboard-control and scroll ownership regression suffices.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const { id } = await codeWalk(page);
  await page.goto(`?mode=present#/${id}/1`);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const copy = await activeCopy(page);
  await copy.focus();
  await page.keyboard.press('Enter');
  await expect(copy).toHaveClass(/is-copied/);
  await expect(copy).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(new RegExp(`#/${id}/1$`));
  await page.goto('?mode=present#/api-member/0');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const output = page.locator('#api-member .replay-output');
  await output.click();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => output.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await expect(page).toHaveURL(/#\/api-member\/0$/);
});