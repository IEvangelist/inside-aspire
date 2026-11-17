import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sectionIds = (pattern: RegExp) => [...html.matchAll(/<section\b[^>]*\bid="([^"]+)"[^>]*>[\s\S]*?<\/section>/g)]
  .filter((match) => pattern.test(match[0])).map((match) => match[1]);
const slides = sectionIds(/class="code-walk-slide/);
const commandSlides = sectionIds(/class="code-walk-command"/);

test('the command follows every service with one source panel and exact reversible line steps', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(testInfo.project.name === 'mobile', 'Mobile exposes the complete reading flow.');
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (typeof options !== 'number' && options.id === 'code-walk') {
        const count = Number(document.documentElement.dataset.codeWalkAnimationCount ?? 0) + 1;
        document.documentElement.dataset.codeWalkAnimationCount = String(count);
      }
      return animate.call(this, frames, options);
    };
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const id of slides) {
    await page.goto(`?mode=present#/${id}`);
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(page.locator(`#${id} .code-pair`)).toHaveCount(0);
    await expect(page.locator(`#${id} .code-walk > .code-panel:visible`)).toHaveCount(1);
    const steps = await page.locator(`#${id} .code-step`).evaluateAll((nodes) => nodes.map((node) => ({
      code: (node as HTMLElement).dataset.code!,
      stage: Number((node as HTMLElement).dataset.stage),
      summary: (node as HTMLElement).dataset.summary!,
      lines: (node as HTMLElement).dataset.lines!.split(',').filter(Boolean).flatMap((range) => {
        const [first, last = first] = range.split('-').map(Number);
        return Array.from({ length: last - first + 1 }, (_, index) => first + index);
      }),
    })));
    await expect(page.locator(`#${id} .code-walk-summary`)).toHaveText(steps[0].summary);
    await expect(page.locator(`#${id} .code-walk-route [aria-current="step"]`))
      .toHaveText((await page.locator(`#${id} .code-walk-route [data-stage="${steps[0].stage}"]`).textContent())!);
    for (const [index, step] of steps.entries()) {
      await page.locator('#next').click();
      await expect(page).toHaveURL(new RegExp(`#/${id}/${index}$`));
      await expect(page.locator(`#${id} .code-walk > .code-panel:visible`)).toHaveCount(1);
      await expect(page.locator(`#${step.code}`)).toBeVisible();
      await expect(page.locator(`#${id} .code-walk-route [aria-current="step"]`))
        .toHaveText((await page.locator(`#${id} .code-walk-route [data-stage="${step.stage}"]`).textContent())!);
      await expect(page.locator(`#${id} .code-walk-summary`)).toHaveText(step.summary);
      expect(await page.locator(`#${step.code} .is-focused`).evaluateAll((nodes) =>
        nodes.map((node) => Number((node as HTMLElement).dataset.line)))).toEqual(step.lines);
      if (index === 0 && testInfo.project.name === 'desktop-dark') {
        await expect(page.locator('html')).toHaveAttribute('data-code-walk-animation-count', /^[1-9]\d*$/);
      }
      const panel = await page.locator(`#${step.code}`).locator('..').locator('..').boundingBox();
      expect(panel!.y + panel!.height).toBeLessThan(page.viewportSize()!.height);
      const pre = page.locator(`#${step.code}`).locator('..');
      expect(await pre.evaluate((element) => ({
        horizontal: element.scrollWidth - element.clientWidth,
        vertical: element.scrollHeight - element.clientHeight,
        wrappedLines: [...element.querySelectorAll<HTMLElement>('.code-line')]
          .filter((line) => line.offsetHeight > parseFloat(getComputedStyle(line).lineHeight) + 1)
          .map((line) => line.dataset.line),
      }))).toEqual({ horizontal: 0, vertical: 0, wrappedLines: [] });
    }
    for (let index = steps.length - 2; index >= 0; index--) {
      const animationCount = Number(await page.locator('html').getAttribute('data-code-walk-animation-count') ?? 0);
      await page.locator('#previous').click();
      const step = steps[index];
      await expect(page.locator(`#${step.code}`)).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`#/${id}/${index}$`));
      await expect(page.locator(`#${id} .code-walk-route [aria-current="step"]`))
        .toHaveText((await page.locator(`#${id} .code-walk-route [data-stage="${step.stage}"]`).textContent())!);
      await expect(page.locator(`#${id} .code-walk-summary`)).toHaveText(step.summary);
      if (index === steps.length - 2 && testInfo.project.name === 'desktop-dark') {
        await expect.poll(async () =>
          Number(await page.locator('html').getAttribute('data-code-walk-animation-count') ?? 0))
          .toBeGreaterThan(animationCount);
      }
    }
    await page.locator('#previous').click();
    await expect(page.locator(`#${id} .is-focused`)).toHaveCount(0);
    await expect(page.locator(`#${id} .code-walk-summary`)).toHaveText(steps[0].summary);
    await expect(page).toHaveURL(new RegExp(`#/${id}$`));
  }
});

test('the command caption stays clear of the source panel at projector sizes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit projector sizes run once.');
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    for (const slide of commandSlides) {
      await page.goto(`?mode=present#/${slide}`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      await page.locator('#next').click();
      const gap = await page.locator(`#${slide}`).evaluate((section) => {
        const panel = section.querySelector('.code-panel.is-active')!.getBoundingClientRect();
        const caption = section.querySelector('.code-walk-command')!.getBoundingClientRect();
        const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slide-scale'));
        return (panel.top - caption.bottom) / scale;
      });
      expect(gap, `${slide} at ${viewport.width}x${viewport.height}`).toBeGreaterThanOrEqual(15);
    }
  }
});

test('all walkthrough excerpts fit without wrapped or clipped code at projector sizes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit projector sizes run once.');
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    for (const id of slides) {
      await page.goto(`?mode=present#/${id}`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      await page.evaluate(() => document.fonts.ready);
      const issues = await page.locator(`#${id}`).evaluate((section) => {
        const panels = [...section.querySelectorAll<HTMLElement>('.code-walk > .code-panel')];
        return panels.flatMap((panel) => {
          panels.forEach((other) => other.classList.toggle('is-active', other === panel));
          const pre = panel.querySelector<HTMLElement>('pre')!;
          const wrapped = [...pre.querySelectorAll<HTMLElement>('.code-line')]
            .filter((line) => line.offsetHeight > parseFloat(getComputedStyle(line).lineHeight) + 1)
            .map((line) => line.dataset.line);
          if (pre.scrollWidth <= pre.clientWidth + 1 && pre.scrollHeight <= pre.clientHeight + 1 &&
              panel.getBoundingClientRect().bottom <= innerHeight && !wrapped.length) return [];
          return [{ code: pre.querySelector('code')!.id, wrapped }];
        });
      });
      expect(issues, `${id} at ${viewport.width}x${viewport.height}`).toEqual([]);
    }
  }
});

test('explicit source steps restore with history and copy only the current file', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One clipboard and history regression suffices.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const slide = slides[0];
  const codes = [...html.matchAll(new RegExp(`<section\\b[^>]*\\bid="${slide}"[\\s\\S]*?</section>`, 'g'))][0][0]
    .match(/class="fragment code-step" data-code="[^"]+"/g)!.map((step) => step.match(/data-code="([^"]+)"/)![1]);
  const index = codes.findIndex((code, position) => position > 0 && codes[position + 1] && codes[position + 1] !== code);
  const [current, following] = [codes[index], codes[index + 1]];
  await page.goto(`?mode=present#/${slide}/${index}`);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await expect(page.locator(`#${current}`)).toBeVisible();
  const source = await page.locator(`#${current}`).textContent();
  await page.locator(`#${slide} .code-panel:visible .copy-code`).click();
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(source);
  await page.locator('#next').click();
  await expect(page.locator(`#${following}`)).toBeVisible();
  await page.goBack();
  await expect(page.locator(`#${current}`)).toBeVisible();
});

test('reading, print and no JavaScript expose the entire source sequence', async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One complete static-mode regression suffices.');
  for (const query of ['?mode=read', '?print-pdf']) {
    await page.goto(query);
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    for (const id of slides) {
      await expect(page.locator(`#${id} .code-walk-status`)).toBeHidden();
      const panels = page.locator(`#${id} .code-walk > .code-panel`);
      for (const panel of await panels.all()) await expect(panel).toBeVisible();
    }
  }
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const staticPage = await context.newPage();
    await staticPage.goto('?mode=read');
    for (const id of slides) {
      for (const panel of await staticPage.locator(`#${id} .code-walk > .code-panel`).all()) {
        await expect(panel).toBeVisible();
      }
    }
  } finally {
    await context.close();
  }
});

test('reduced motion still allows deliberate code steps without hiding source behind disabled fragments', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Presentation stepping is a desktop operation.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const id of slides) {
    await page.goto(`?mode=present#/${id}`);
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(page.locator(`#${id} .code-panel:visible`)).toHaveCount(1);
    const codes = await page.locator(`#${id} .code-step`).evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).dataset.code!));
    for (const [index, code] of codes.entries()) {
      await page.locator('#next').click();
      await expect(page).toHaveURL(new RegExp(`#/${id}/${index}$`));
      await expect(page.locator(`#${code}`)).toBeVisible();
    }
    await page.locator('#next').click();
    await expect(page).not.toHaveURL(new RegExp(`#/${id}(?:/\\d+)?$`));
  }
});