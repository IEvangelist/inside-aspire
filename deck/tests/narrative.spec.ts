import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const points = ["Know what's true.", 'Act precisely.', 'Stay current.'];
const order = [
  'intro', 'thesis', 'know-truth', 'live-cli', 'api-code', 'api-index', 'index', 'parser', 'lexical',
  'act-precisely', 'weather', 'skills-vs-tools', 'skills', 'compiler', 'lifecycle', 'the-loop',
  'stay-current', 'browser-evidence', 'evidence', 'writer', 'docs-supply', 'workflow', 'close',
  'history', 'historical-evidence', 'sources',
];
const chapters = [
  { point: points[0], why: "A confident answer isn't evidence.",
    slides: ['know-truth', 'live-cli', 'api-code', 'api-index', 'index', 'parser', 'lexical'],
    purposes: ['why', 'proof', 'proof', 'machinery', 'machinery', 'machinery', 'machinery'] },
  { point: points[1], why: "Writing code isn't operating a system.",
    slides: ['act-precisely', 'weather', 'skills-vs-tools', 'skills', 'compiler', 'lifecycle', 'the-loop'],
    purposes: ['why', 'proof', 'machinery', 'machinery', 'machinery', 'machinery', 'machinery'] },
  { point: points[2], why: 'Correct today can be stale tomorrow.',
    slides: ['stay-current', 'browser-evidence', 'evidence', 'writer', 'docs-supply', 'workflow'],
    purposes: ['why', 'proof', 'proof', 'proof', 'machinery', 'machinery'] },
];
const evidence: { cli: { apiId: string; signature: string } } =
  JSON.parse(readFileSync(resolve('..', 'docs', 'evidence', 'browser-logs.json'), 'utf8'));

test('exactly three identical benefits drive roadmap, chapter entries, and close', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const actualOrder = await page.locator('section[id]').evaluateAll((slides) => slides.map((slide) => slide.id));
  expect(actualOrder).toEqual(order);
  expect(await page.locator('#thesis [data-takeaway]').allTextContents()).toEqual(points);
  expect(await page.locator('section[data-purpose="why"] [data-takeaway]').allTextContents()).toEqual(points);
  expect(await page.locator('#close [data-takeaway]').allTextContents()).toEqual(points);
  await expect(page.locator('[data-takeaway]')).toHaveCount(9);
  await expect(page.locator('[data-core-chapter]')).toHaveCount(3);
  await expect(page.locator('#thesis h2')).toContainText('Aspire makes AI');
  await expect(page.locator('#close h2')).toContainText('more efficient.');
});

test('each chapter shows why and concrete proof before its supporting machinery', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  for (const chapter of chapters) {
    const slides = await page.locator('section[data-purpose]').evaluateAll((sections, point) =>
      sections.filter((section) => section.getAttribute('data-chapter') === point)
        .map((section) => ({ id: section.id, purpose: section.getAttribute('data-purpose') })), chapter.point);
    expect(slides.map((slide) => slide.id)).toEqual(chapter.slides);
    expect(slides.map((slide) => slide.purpose)).toEqual(chapter.purposes);
    await expect(page.locator(`#${chapter.slides[0]} [data-why]`)).toHaveText(chapter.why);
    await expect(page.locator(`#${chapter.slides[0]} .big-support`)).not.toBeEmpty();
  }
  expect(order.indexOf('live-cli')).toBeLessThan(order.indexOf('api-index'));
  expect(order.indexOf('api-code')).toBeLessThan(order.indexOf('parser'));
  expect(order.indexOf('weather')).toBeLessThan(order.indexOf('compiler'));
  expect(order.indexOf('skills-vs-tools')).toBeLessThan(order.indexOf('skills'));
  expect(order.indexOf('browser-evidence')).toBeLessThan(order.indexOf('evidence'));
  expect(order.indexOf('docs-supply')).toBeLessThan(order.indexOf('workflow'));
  await expect(page.locator('#index')).toContainText('narrative-docs');
  await expect(page.locator('#lexical')).toContainText('not the separate compiler-derived API index');
  await expect(page.locator('#api-index .notes')).toContainText('Do not attribute the narrative');
});

test('early API response and scoped operations are actual copyable evidence, not wrappers', async ({ page }) => {
  await page.goto('#/api-code');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const response = JSON.parse(await page.locator('#api-code .language-json').textContent() ?? 'null');
  expect(response).toEqual({ id: evidence.cli.apiId, name: evidence.cli.signature, language: 'csharp', kind: 'member' });
  await expect(page.locator('#api-code .notes')).toContainText('recorded public CLI response');
  await expect(page.locator('#api-code .language-typescript')).toContainText('renderCSharpMemberKindMarkdown');
  const commands = await page.locator('#skills-vs-tools .language-powershell').textContent();
  expect(commands).toBe([
    "aspire wait api --apphost 'demo\\host\\apphost.cs' --status healthy --timeout 120 --non-interactive",
    "aspire describe --apphost 'demo\\host\\apphost.cs' --format Json --non-interactive",
    "aspire otel traces api --apphost 'demo\\host\\apphost.cs' --format Json --non-interactive",
  ].join('\n'));
  expect(commands).not.toMatch(/pwsh|\.ps1|--force|\$aspire/);
  await expect(page.locator('#skills-vs-tools')).toContainText('File-based instructions');
  await expect(page.locator('#skills-vs-tools')).toContainText('Executable operations');
  await expect(page.locator('#weather .notes')).toContainText('Prove the benefit before opening the architecture');
});

test('speaker notes cover a contiguous full-hour presentation with untimed appendices after the close', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const main = await page.locator('section:not([data-appendix]) > .notes').allTextContents();
  expect(main).toHaveLength(23);
  const spans = main.map((note) => {
    const match = note.match(/^(\d):(\d{2})-(\d):(\d{2})\./);
    expect(match, `A main slide is missing its explicit time range: ${note.slice(0, 90)}`).not.toBeNull();
    return { start: Number(match![1]) * 60 + Number(match![2]),
      end: Number(match![3]) * 60 + Number(match![4]) };
  });
  let minute = 0;
  for (const span of spans) {
    expect(span.start).toBe(minute);
    expect(span.end).toBeGreaterThan(span.start);
    minute = span.end;
  }
  expect(minute).toBe(60);
  const appendices = await page.locator('section[data-appendix]').evaluateAll((slides) =>
    slides.map((slide) => ({ id: slide.id, notes: slide.querySelector('.notes')!.textContent! })));
  expect(appendices.map((slide) => slide.id)).toEqual(['history', 'historical-evidence', 'sources']);
  for (const appendix of appendices) {
    expect(order.indexOf(appendix.id)).toBeGreaterThan(order.indexOf('close'));
    expect(appendix.notes).toContain('outside the 60-minute presentation');
    expect(appendix.notes).not.toMatch(/\d:\d{2}-\d:\d{2}/);
  }
  await expect(page.locator('#close .notes')).toContainText('Q&A and networking follow separately');
  const runbook = readFileSync(resolve('..', 'docs', 'RUNBOOK.md'), 'utf8');
  expect(runbook).toContain('All 60 minutes are presentation time. Q&A and networking are separate.');
  expect(runbook).not.toMatch(/slot includes questions|close, and questions/);
  for (const point of points) expect(runbook).toContain(point);
});

test('plain backward chapter hashes reset steps while explicit fragments and Back restore them', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Presentation steps are tested in both desktop themes; mobile uses complete reading.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('?mode=present#/the-loop');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  for (let step = 1; step <= 5; step++) await page.locator('#next').click();
  await expect(page.locator('#the-loop .fragment.visible')).toHaveCount(5);
  await page.goto('?mode=present#/compiler');
  await expect(page.locator('#compiler .fragment.visible')).toHaveCount(0);
  await page.locator('#next').click();
  await expect(page.locator('#compiler .fragment.visible')).toHaveCount(1);
  await page.locator('#previous').click();
  await expect(page.locator('#compiler .fragment.visible')).toHaveCount(0);
  await page.goto('?mode=present#/parser');
  await expect(page.locator('#parser .fragment.visible')).toHaveCount(0);
  await page.locator('#next').click();
  await expect(page.locator('#parser-code .is-focused')).toHaveCount(5);
  await page.goto('?mode=present#/the-loop/2');
  await expect(page.locator('#the-loop .fragment.visible')).toHaveCount(3);
  await page.locator('#previous').click();
  await expect(page.locator('#the-loop .fragment.visible')).toHaveCount(2);
});

for (const mode of ['present', 'read'] as const) {
  test(`three core chapters and their supporting slides navigate with exact counters in ${mode}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit light/dark/input/mode navigation runs once.');
    for (const theme of ['light', 'dark'] as const) {
      await page.setViewportSize({ width: mode === 'read' ? 390 : 1280, height: mode === 'read' ? 844 : 720 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(`?theme=${theme}&mode=${mode}`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      for (const chapter of chapters) {
        await page.locator('#menu-toggle').click();
        const link = page.locator(`[data-core-chapter="${chapter.point}"]`);
        await link.focus();
        await page.keyboard.press('Enter');
        const first = chapter.slides[0];
        await expect(page).toHaveURL(new RegExp(`#/${first}$`));
        await expect(page.locator(`#${first} h2`)).toBeInViewport();
        await expect(page.locator(`#${first} [data-why]`)).toBeVisible();
        await expect(page.locator('#chapter-label')).toHaveText(chapter.point);
        await expect(page.locator('#slide-position')).toHaveText(`${order.indexOf(first) + 1} / 26`);
        await page.locator('#next').click();
        await expect(page).toHaveURL(new RegExp(`#/${chapter.slides[1]}$`));
        await expect(page.locator('#chapter-label')).toHaveText(chapter.point);
        await page.locator('#menu-toggle').click();
        await expect(link).toHaveAttribute('aria-current', 'step');
        expect(await page.locator('[data-core-chapter][aria-current="step"]').count()).toBe(1);
        await page.keyboard.press('Escape');
        await expect(page.locator('#menu-toggle')).toBeFocused();
      }
      if (mode === 'read') {
        for (const id of ['thesis', 'api-code', 'skills-vs-tools']) {
          await page.evaluate((slideId) => { location.hash = `/${slideId}`; }, id);
          const ending = page.locator(`#${id} > .source-line`).last();
          await ending.scrollIntoViewIfNeeded();
          await expect(ending).toBeInViewport();
          const bounds = await ending.boundingBox();
          expect(bounds!.y).toBeGreaterThanOrEqual(56);
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
        }
      }
    }
  });
}
