import { expect, test, type Page } from '@playwright/test';
import { transitionSettings, validateTransitionSettings } from '../src/transitions';

// The first code-walk slide whose fragments focus code lines.
async function codeWalk(page: Page) {
  await ready(page, '?mode=present');
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.slides > section')]
    .find((slide) => slide.querySelector('.code-panel .code-line') && slide.querySelectorAll('.fragment').length > 1)!.id);
}

async function ready(page: Page, query: string) {
  await page.goto(query);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
}

test('native deck defaults, real chapter settings and explicit slide attributes have independent precedence', async ({ page }) => {
  await ready(page, '?mode=present#/intro');
  await expect(page.locator('#presentation')).toHaveClass(/slide/);
  await expect(page.locator('#intro')).toHaveAttribute('data-transition', 'slide');
  await expect(page.locator('#intro')).toHaveAttribute('data-transition-speed', 'fast');
  await expect(page.locator('#intro')).toHaveAttribute('data-background-transition', 'none');
  await expect(page.locator('#dashboard')).toHaveAttribute('data-transition', 'slide-in fade-out');
  await expect(page.locator('#dashboard')).toHaveAttribute('data-transition-speed', 'default');
  await expect(page.locator('#dashboard')).toHaveAttribute('data-background-transition', 'fade');
  await expect(page.locator('#dashboard-integrated')).toHaveAttribute('data-transition', 'slide');
  await expect(page.locator('#weather')).toHaveAttribute('data-transition', 'fade-in slide-out');
  expect(await page.locator('#dashboard-integrated').evaluate((node) =>
    Math.max(...getComputedStyle(node).transitionDuration.split(',').map(parseFloat)))).toBe(0.8);
});

test('the request walkthrough changes slides without moving either slide, in both directions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One presentation-mode transition regression suffices.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page, '?mode=present');
  // Adjacent slides that both author data-transition="none", derived from the deck.
  const pairs = await page.evaluate(() => {
    const slides = [...document.querySelectorAll<HTMLElement>('.slides > section')];
    return slides.slice(0, -1).flatMap((slide, index) => slide.dataset.transition === 'none' && slides[index + 1].dataset.transition === 'none'
      ? [[slide.id, slides[index + 1].id] as const] : []);
  });
  expect(pairs.length).toBeGreaterThan(0);
  for (const [from, to] of pairs) {
    await ready(page, `?mode=present#/${from}`);
    for (const id of [from, to]) {
      const slide = page.locator(`#${id}`);
      await expect(slide).toHaveAttribute('data-transition', 'none');
      expect(await slide.evaluate((element) => getComputedStyle(element).transitionProperty)).toBe('none');
    }
    for (let step = 0; step < 30 && await page.locator(`#${to}.present`).count() === 0; step++) {
      await page.locator('#next').click();
    }
    await expect(page).toHaveURL(new RegExp(`#/${to}$`));
    await expect(page.locator(`#${to}`)).toHaveClass(/present/);
    await page.locator('#previous').click();
    await expect(page).toHaveURL(new RegExp(`#/${from}(/\\d+)?$`));
    await expect(page.locator(`#${from}`)).toHaveClass(/present/);
  }
});

test('an explicit native slide speed and background override chapter and deck values without changing source text', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One actual native-attribute override fixture suffices.');
  await page.route((url) => url.pathname === '/inside-aspire/', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(
      'data-transition="fade-in slide-out"',
      'data-transition="fade-in slide-out" data-transition-speed="slow" data-background-transition="zoom"') });
  });
  await ready(page, '?mode=present#/weather');
  await expect(page.locator('#weather')).toHaveAttribute('data-transition-speed', 'slow');
  await expect(page.locator('#weather')).toHaveAttribute('data-background-transition', 'zoom');
  expect(await page.locator('#weather').evaluate((node) =>
    Math.max(...getComputedStyle(node).transitionDuration.split(',').map(parseFloat)))).toBe(1.2);
});

for (const mode of ['reduce', 'read', 'print', 'receiver'] as const) {
  test(`authored directional slides and background overrides cannot re-enable motion in ${mode}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit no-motion contexts run once each.');
    await page.emulateMedia({ reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference' });
    await ready(page, mode === 'print' ? '?print-pdf' :
      mode === 'receiver' ? `?mode=read&receiver&history=false&transition=none#/${await codeWalk(page)}/1` :
        `?mode=${mode === 'read' ? 'read' : 'present'}#/weather`);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'none');
    const actual = await page.locator('.slides section[id]').evaluateAll((slides) => slides.map((slide) => ({
      transition: slide.getAttribute('data-transition'), speed: slide.getAttribute('data-transition-speed'),
      background: slide.getAttribute('data-background-transition'),
      durations: getComputedStyle(slide).transitionDuration.split(',').map(parseFloat),
    })));
    expect(actual.length).toBeGreaterThan(0);
    expect(actual).toHaveLength(await page.locator('.slides section[data-chapter]').count());
    expect(actual.every((slide) => slide.transition === 'none' && slide.background === 'none' &&
      slide.speed === 'default' && slide.durations.every((duration) => duration === 0))).toBe(true);
    if (mode === 'receiver') {
      await expect(page.locator('html')).toHaveAttribute('data-reading', 'false');
      await expect(page.locator('.present .code-line.is-focused').first()).toBeAttached();
      await expect(page.locator('.toolbar')).toBeHidden();
    }
  });
}

test('live reduced-motion and reading toggles restore authored native overrides without changing the requested slide', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One preference/mode interruption path suffices.');
  await ready(page, '?mode=present#/weather');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#weather')).toHaveAttribute('data-transition', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('#weather')).toHaveAttribute('data-transition', 'fade-in slide-out');
  await page.locator('#presentation').focus();
  await page.keyboard.press('r');
  await expect(page.locator('#weather')).toHaveAttribute('data-transition', 'none');
  await page.keyboard.press('r');
  await expect(page.locator('#weather')).toHaveAttribute('data-transition', 'fade-in slide-out');
  await expect(page.locator('.slides section.present')).toHaveAttribute('id', 'weather');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#weather')).toHaveAttribute('data-transition', 'none');
  await expect(page.locator('#api-member .replay-response')).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await expect(page.locator('#weather')).toHaveAttribute('data-transition', 'fade-in slide-out');
});

test('native chapter-entry in/out effects retain exact Back symmetry, fragment restoration and interrupted jumps', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Both presentation themes exercise native chapter-boundary navigation.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // The first chapter-entry slide with a directional in/out effect, and the slide before it.
  const walk = await codeWalk(page);
  const { before, steps, entry, after } = await page.evaluate(() => {
    const slides = [...document.querySelectorAll<HTMLElement>('.slides > section')];
    const index = slides.findIndex((slide, i) => i > 0 && /-in .+-out$/.test(slide.dataset.transition ?? '')
      && slide.querySelectorAll('.fragment').length === 0);
    return {
      before: slides[index - 1].id, steps: slides[index - 1].querySelectorAll('.fragment').length,
      entry: slides[index].id, transition: slides[index].dataset.transition, after: slides[index + 1].id,
    };
  });
  const beforeHash = steps ? `${before}/${steps - 1}` : before;
  const effect = await page.locator(`#${entry}`).getAttribute('data-transition');
  await ready(page, `?mode=present#/${beforeHash}`);
  await page.locator('#next').click();
  await expect(page).toHaveURL(new RegExp(`#/${entry}$`));
  await expect(page.locator(`#${entry}`)).toHaveAttribute('data-transition', effect!);
  await page.locator('#next').click();
  await expect(page).toHaveURL(new RegExp(`#/${after}$`));
  await page.locator('#previous').click();
  await expect(page).toHaveURL(new RegExp(`#/${entry}$`));
  await page.locator('#previous').click();
  await expect(page).toHaveURL(new RegExp(`#/${beforeHash}$`));
  await expect(page.locator(`#${before} .fragment.visible`)).toHaveCount(steps);
  await page.evaluate(({ walk, entry }) => { location.hash = `/${entry}`; location.hash = `/${walk}/1`; }, { walk, entry });
  await expect(page.locator('.slides section.present')).toHaveAttribute('id', walk);
  await expect(page).toHaveURL(new RegExp(`#/${walk}/1$`));
  await expect(page.locator('.present .code-line.is-focused').first()).toBeVisible();
});

test('invalid native defaults and chapter names/styles/speeds fail with their scope', () => {
  const chapters = new Set(['AI loops', 'Aspire dashboard', 'Aspire deployment']);
  expect(() => validateTransitionSettings({
    defaults: { style: 'none', speed: 'default', background: 'none' },
    chapters: { 'AI loops': { style: 'none', background: 'none' } },
  }, chapters)).not.toThrow();
  expect(() => validateTransitionSettings({
    defaults: { style: 'sparkle', speed: 'fast', background: 'none' }, chapters: {},
  }, chapters)).toThrow('deck default');
  expect(() => validateTransitionSettings({
    ...transitionSettings, chapters: { Missing: { style: 'fade' } },
  }, chapters)).toThrow('chapter "Missing"');
  expect(() => validateTransitionSettings({
    ...transitionSettings, chapters: { 'AI loops': { style: 'slide-in slide-in' } },
  }, chapters)).toThrow('chapter "AI loops"');
  expect(() => validateTransitionSettings({
    ...transitionSettings, chapters: { 'AI loops': { speed: 'warp' } },
  }, chapters)).toThrow('invalid speed');
  for (const value of ['none-in', 'none-out', 'none-in fade-out', 'fade-in none-out', 'none-in none-out']) {
    expect(() => validateTransitionSettings({
      ...transitionSettings, chapters: { 'AI loops': { style: value } },
    }, chapters), value).toThrow('chapter "AI loops"');
  }
});

for (const [value, expected] of [
  ['data-transition="sparkle"', 'invalid style'],
  ['data-transition="slide-in fade-out zoom-out"', 'invalid style'],
  ['data-transition="none-in"', 'invalid style'],
  ['data-transition="none-out"', 'invalid style'],
  ['data-transition="none-in fade-out"', 'invalid style'],
  ['data-transition="fade-in none-out"', 'invalid style'],
  ['data-transition-speed="warp"', 'invalid speed'],
  ['data-background-transition="sparkle"', 'invalid style'],
] as const) {
  test(`invalid explicit slide ${value} is reported visibly with its identity`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'The exact native authoring-validation matrix runs once.');
    await page.route((url) => url.pathname === '/inside-aspire/', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace(
        'data-transition="fade-in slide-out"', value) });
    });
    await page.goto('?mode=present#/weather');
    await expect(page.locator('#deck-status')).toContainText('slide "weather"');
    await expect(page.locator('#deck-status')).toContainText(expected);
    await expect(page.locator('html')).not.toHaveAttribute('data-deck-ready', 'true');
  });
}

test('whole none remains a valid explicit native slide and background transition', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One actual native whole-style acceptance regression suffices.');
  await page.route((url) => url.pathname === '/inside-aspire/', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(
      'data-transition="fade-in slide-out"', 'data-transition="none" data-background-transition="none"') });
  });
  await ready(page, '?mode=present#/weather');
  await expect(page.locator('#weather')).toHaveAttribute('data-transition', 'none');
  await expect(page.locator('#weather')).toHaveAttribute('data-background-transition', 'none');
});
