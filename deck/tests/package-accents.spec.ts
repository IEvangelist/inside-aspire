import { expect, test, type Page } from '@playwright/test';
import { validatePackageMarkup } from '../src/packages';

async function ready(page: Page, id: string) {
  await page.goto(`?mode=present#/${id}`);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
}

async function focusedCorners(page: Page, code: string) {
  return page.locator(`#${code} .is-focused`).evaluateAll((lines) => lines.map((line) => {
    const style = getComputedStyle(line);
    const box = line.getBoundingClientRect();
    return {
      number: Number((line as HTMLElement).dataset.line), top: box.top, bottom: box.bottom,
      corners: [style.borderTopLeftRadius, style.borderTopRightRadius,
        style.borderBottomLeftRadius, style.borderBottomRightRadius].map(parseFloat),
    };
  }));
}

test('contiguous code focus bands have square interior joins and only their outer ends rounded through Next and Back', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit line-focus/theme matrix runs once.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const theme of ['light', 'dark']) {
    for (const [slide, code, ranges] of [
      ['parser', 'parser-code', [[1, 5], [7, 9]]],
      ['lifecycle', 'apphost-code', [[1, 5], [7, 12]]],
    ] as const) {
      await page.goto(`?theme=${theme}&mode=present#/${slide}`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      const source = await page.locator(`#${code}`).textContent();
      expect(await focusedCorners(page, code)).toEqual([]);
      for (const [index, [first, last]] of ranges.entries()) {
        await page.locator('#next').click();
        const lines = await focusedCorners(page, code);
        expect(lines.map((line) => line.number)).toEqual(
          Array.from({ length: last - first + 1 }, (_, offset) => first + offset));
        for (const [position, line] of lines.entries()) {
          expect(line.corners).toEqual([
            position === 0 ? 6 : 0, position === 0 ? 6 : 0,
            position === lines.length - 1 ? 6 : 0, position === lines.length - 1 ? 6 : 0,
          ]);
          if (position) expect(Math.abs(line.top - lines[position - 1].bottom)).toBeLessThanOrEqual(0.5);
        }
        expect(await page.locator(`#${code}`).textContent()).toBe(source);
        await expect(page).toHaveURL(new RegExp(`#/${slide}/${index}$`));
      }
      await page.locator('#previous').click();
      expect((await focusedCorners(page, code)).map((line) => line.number)).toEqual([1, 2, 3, 4, 5]);
      const path = testInfo.outputPath(`${slide}-${theme}-connected-focus-band.png`);
      await page.screenshot({ path });
      await testInfo.attach(`${slide}-${theme}-connected-focus-band`, { path, contentType: 'image/png' });
      await page.locator('#previous').click();
      expect(await focusedCorners(page, code)).toEqual([]);
    }
  }
});

test('isolated and disjoint focused groups round independently without changing the source or copy text', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One exact disjoint regression exercises the shared CSS.');
  await ready(page, 'lifecycle');
  const source = await page.locator('#apphost-code').textContent();
  await page.locator('#apphost-code').evaluate((code) => {
    for (const number of [1, 3, 4, 7]) code.querySelector(`[data-line="${number}"]`)!.classList.add('is-focused');
  });
  const lines = await focusedCorners(page, 'apphost-code');
  expect(lines.map(({ number, corners }) => ({ number, corners }))).toEqual([
    { number: 1, corners: [6, 6, 6, 6] },
    { number: 3, corners: [6, 6, 0, 0] },
    { number: 4, corners: [0, 0, 6, 6] },
    { number: 7, corners: [6, 6, 6, 6] },
  ]);
  expect(await page.locator('#apphost-code').evaluate((code) => {
    const range = document.createRange();
    range.selectNodeContents(code);
    return range.toString();
  })).toBe(source);
});

test('package legends identify only real mapped APIs while common operations and all original copied source stay unchanged', async ({ page }) => {
  await ready(page, 'lifecycle');
  for (const [id, label, apis, common] of [
    ['apphost-code', 'Aspire.Hosting.JavaScript', ['AddViteApp', 'WithNpm'], ['WithReference', 'WaitFor', 'WithEnvironment', 'WithHttpEndpoint']],
    ['compose-environment-code', 'Aspire.Hosting.Docker', ['AddDockerComposeEnvironment', 'WithDashboard'], []],
  ] as const) {
    const code = page.locator(`#${id}`);
    const names = await code.locator('.pkg-api').allTextContents();
    expect(names).toEqual([...apis]);
    const describedBy = await code.locator('..').getAttribute('aria-describedby');
    expect(describedBy).toBe(`${id}-packages`);
    await expect(page.locator(`#${describedBy}`)).toContainText(label);
    for (const token of await code.locator('.pkg-api').all()) {
      await expect(token).toHaveAttribute('title', `${await token.textContent()} - ${label}`);
      await expect(token).toHaveCSS('text-decoration-line', 'underline');
    }
    expect(names.some((api) => common.some((name) => name === api))).toBe(false);
    const copied = await code.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.toString();
    });
    expect(copied).toBe(await code.textContent());
    const rails = await code.locator('[data-rail]').evaluateAll((lines) => lines.map((line) => ({
      number: Number((line as HTMLElement).dataset.line),
      width: getComputedStyle(line, '::after').width,
      text: line.textContent,
    })));
    expect(rails.length).toBeGreaterThan(0);
    expect(rails.every((rail) => rail.width === '4px' && rail.text !== null)).toBe(true);
  }
  await expect(page.locator('[data-cli-replay] .pkg-api, [data-cli-replay] .package-legend')).toHaveCount(0);
  await expect(page.locator('[data-cli-replay]')).toHaveCount(7);
});

test('semantic roles, mapped identifiers, labels and rails retain theme and print contrast without a color-only dependency', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One complete explicit theme/media contrast matrix suffices.');
  for (const theme of ['light', 'dark']) {
    for (const media of ['screen', 'print'] as const) {
      await page.emulateMedia({ media, colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(`?theme=${theme}&mode=read`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      const samples = await page.evaluate((mode) => {
        function channels(color: string) {
          const values = color.match(/[\d.]+/g)?.map(Number);
          if (!values || values.length < 3) throw new Error(`Unsupported computed contrast color: ${color}`);
          return values;
        }
        function luminance(rgb: number[]) {
          return rgb.map((value) => value / 255).map((value) =>
            value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
            .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
        }
        function paintedBackground(element: Element) {
          const rgb = [0, 0, 0];
          let uncovered = 1;
          for (let current: Element | null = element; current; current = current.parentElement) {
            const values = channels(getComputedStyle(current).backgroundColor);
            const alpha = values[3] ?? 1;
            rgb.forEach((_, index) => { rgb[index] += values[index] * alpha * uncovered; });
            uncovered *= 1 - alpha;
            if (uncovered === 0) return rgb;
          }
          throw new Error('Contrast measurement could not resolve an opaque painted ancestor.');
        }
        const result = [];
        for (const token of document.querySelectorAll<HTMLElement>('.pkg-api, .package-label')) {
          const api = token.matches('.pkg-api');
          if (api) {
            const line = token.closest<HTMLElement>('.code-line')!;
            line.classList.add('is-focused');
            // Transparent print lines paint their light code panel, never opaque black.
            if (mode === 'print') line.style.backgroundColor = 'transparent';
          }
          const backgroundRgb = paintedBackground(token);
          const text = luminance(channels(getComputedStyle(token).color).slice(0, 3));
          const background = luminance(backgroundRgb);
          result.push({ api, backgroundRgb, ratio: (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05) });
        }
        return result;
      }, media);
      expect(samples.length).toBeGreaterThanOrEqual(6);
      expect(Math.min(...samples.map((sample) => sample.ratio))).toBeGreaterThanOrEqual(4.5);
      if (media === 'print') {
        for (const sample of samples.filter((sample) => sample.api)) expect(sample.backgroundRgb).toEqual([239, 236, 247]);
      }
      await expect(page.locator('#lifecycle .package-label')).toContainText('Aspire.Hosting.JavaScript');
      await expect(page.locator('#deployment-model .package-label')).toContainText('Aspire.Hosting.Docker');
    }
  }
});

test('duplicate authored package attributes are rejected before HTML parsing can discard them', () => {
  expect(() => validatePackageMarkup(
    '<section id="example"><pre data-label="CSharp" data-pkg-cyan="One" data-pkg-cyan="Two">'))
    .toThrow('slide "example", block "CSharp": duplicate data-pkg-cyan');
});

for (const [name, replacement, expected] of [
  ['unknown accent', 'data-pkg-orange="Unknown" data-apis-orange="AddViteApp"', 'unknown accent'],
  ['missing label', 'data-apis-cyan="AddViteApp"', 'needs a package name'],
  ['missing APIs', 'data-pkg-cyan="Aspire.Hosting.JavaScript"', 'needs exact API identifiers'],
  ['API absent', 'data-pkg-cyan="Aspire.Hosting.JavaScript" data-apis-cyan="NotARealApi"', 'not present as a code token'],
  ['string content', 'data-pkg-cyan="Aspire.Hosting.JavaScript" data-apis-cyan="frontend"', 'strings and comments do not count'],
  ['out of range', 'data-pkg-cyan="Aspire.Hosting.JavaScript" data-apis-cyan="AddViteApp" data-lines-cyan="7-99"', 'exceeds the block'],
  ['API outside rail', 'data-pkg-cyan="Aspire.Hosting.JavaScript" data-apis-cyan="AddViteApp" data-lines-cyan="1-5"', 'outside its package'],
  ['duplicate ownership', 'data-pkg-cyan="One" data-apis-cyan="AddViteApp" data-pkg-pink="Two" data-apis-pink="AddViteApp"', 'owned by more than one'],
  ['overlapping rails', 'data-pkg-cyan="One" data-apis-cyan="AddViteApp" data-lines-cyan="7-12" data-pkg-pink="Two" data-apis-pink="WithNpm" data-lines-pink="9-12"', 'ranges overlap'],
] as const) {
  test(`invalid package ${name} produces a visible slide/block error rather than a partial successful deck`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'The exact source-validation matrix runs once.');
    await page.route((url) => url.pathname === '/inside-aspire/', async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        'data-pkg-cyan="Aspire.Hosting.JavaScript" data-add-cyan="javascript" data-apis-cyan="AddViteApp WithNpm" data-lines-cyan="7-12"',
        replacement);
      await route.fulfill({ response, body: html });
    });
    await page.goto('?mode=present#/lifecycle');
    await expect(page.locator('#deck-status')).toContainText('slide "lifecycle"');
    await expect(page.locator('#deck-status')).toContainText('AppHost native executable wiring');
    await expect(page.locator('#deck-status')).toContainText(expected);
    await expect(page.locator('html')).not.toHaveAttribute('data-deck-ready', 'true');
  });
}

test('the optional reference shows real C# top-level AppHost and Go workload boundaries without replacing any original slide or example', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One actual disclosure/dialog source path suffices.');
  await page.setViewportSize({ width: 1280, height: 720 });
  await ready(page, 'history');
  const disclosure = page.locator('.language-examples');
  await expect(disclosure).not.toHaveAttribute('open', '');
  await disclosure.locator('summary').click();
  await expect(page.locator('html')).toHaveAttribute('data-reading', 'false');
  await expect(disclosure).not.toHaveAttribute('open', '');
  const reference = page.locator('#slide-details');
  await expect(reference).toBeVisible();
  await expect(reference).toContainText('Go runs as a workload');
  await expect(reference).toContainText('not the weather demo');
  await expect(reference).toContainText('apphost.mts');
  await expect(page.locator('#go-apphost-code')).toContainText('var builder = DistributedApplication.CreateBuilder(args);');
  await expect(page.locator('#go-apphost-code')).toContainText('.WithHttpEndpoint(port: 8080, env: "PORT")');
  await expect(page.locator('#go-apphost-code .pkg-api')).toHaveText('AddGoApp');
  await expect(reference.locator('.package-legend')).toContainText('Aspire.Hosting.Go');
  await expect(reference.locator('.package-legend')).toContainText('aspire add go');
  await expect(page.locator('#go-service-code')).toContainText('func main()');
  await expect(page.locator('#go-service-code')).toContainText('os.Getenv("PORT")');
  await expect(page.locator('#go-service-code .pkg-api')).toHaveCount(0);
  for (const code of await reference.locator('pre code').all()) {
    const copied = await code.evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.toString();
    });
    expect(copied).toBe(await code.textContent());
  }
  await expect(page.locator('.slides section[id]')).toHaveCount(41);
  await expect(page.locator('pre code')).toHaveCount(32);
  await expect(page.locator('pre code:not([data-illustrative-addition] pre code)')).toHaveCount(30);
});

test('one bounded package/language visual batch keeps all labels, rails, source and optional references readable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit desktop/short/narrow/theme batch runs once.');
  for (const layout of [
    { width: 1280, height: 720, theme: 'dark', mode: 'present' },
    { width: 1024, height: 576, theme: 'light', mode: 'present' },
    { width: 617, height: 900, theme: 'light', mode: 'read' },
    { width: 390, height: 844, theme: 'dark', mode: 'read' },
    { width: 320, height: 760, theme: 'light', mode: 'read' },
  ] as const) {
    await page.setViewportSize(layout);
    await page.emulateMedia({ colorScheme: layout.theme, reducedMotion: 'reduce' });
    await page.goto(`?theme=${layout.theme}&mode=${layout.mode}`);
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await page.evaluate(() => document.fonts.ready);
    for (const id of ['lifecycle', 'deployment-model', 'history']) {
      await page.evaluate((id) => { location.hash = `/${id}`; }, id);
      await expect(page.locator(`#${id} h2`)).toBeInViewport();
      const path = testInfo.outputPath(`${id}-${layout.width}-${layout.theme}.png`);
      await page.screenshot({ path });
      await testInfo.attach(`${id}-${layout.width}-${layout.theme}`, { path, contentType: 'image/png' });
    }
    if (layout.mode === 'read') {
      const reference = page.locator('.language-reference-pair');
      await reference.scrollIntoViewIfNeeded();
      for (const pre of await reference.locator('pre').all()) {
        expect(await pre.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
        expect(await pre.evaluate((node) => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1);
      }
      const path = testInfo.outputPath(`language-references-${layout.width}-${layout.theme}.png`);
      await page.screenshot({ path });
      await testInfo.attach(`language-references-${layout.width}-${layout.theme}`, { path, contentType: 'image/png' });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
