import { expect, test, type Page } from '@playwright/test';

async function openDeck(page: Page, theme: 'light' | 'dark', width: number, height: number, mode: 'present' | 'read') {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.goto(`?theme=${theme}&mode=${mode}`);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
}

for (const theme of ['light', 'dark'] as const) {
  for (const viewport of [
    { width: 1280, height: 720, mode: 'present' },
    { width: 1920, height: 1080, mode: 'present' },
    { width: 1024, height: 768, mode: 'present' },
    { width: 1024, height: 576, mode: 'present' },
    { width: 320, height: 760, mode: 'read' },
    { width: 390, height: 844, mode: 'read' },
    { width: 617, height: 900, mode: 'read' },
    { width: 768, height: 1024, mode: 'read' },
    { width: 790, height: 900, mode: 'read' },
  ] as const) {
    test(`all 41 slides fit ${theme} ${viewport.width}x${viewport.height} ${viewport.mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit all-slide/theme matrix runs once.');
      await openDeck(page, theme, viewport.width, viewport.height, viewport.mode);
      const ids = await page.locator('section[id]').evaluateAll((slides) => slides.map((slide) => slide.id));
      expect(ids).toHaveLength(41);
      const results = [];
      for (const id of ids) {
        await page.evaluate((slideId) => { window.location.hash = `/${slideId}`; }, id);
        await expect(page.locator(`#${id} h1, #${id} h2`).first()).toBeInViewport();
        const result = await page.locator(`#${id}`).evaluate((slide) => {
          const issues: string[] = [];
          const reading = document.documentElement.dataset.reading === 'true';
          const tolerance = 1.5;
          function visible(element: Element) {
            for (let parent: Element | null = element; parent; parent = parent.parentElement) {
              const style = getComputedStyle(parent);
              if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
            }
            return element.getClientRects().length > 0;
          }
          const heading = slide.querySelector('h1, h2')!;
          const toolbar = document.querySelector('.toolbar')!.getBoundingClientRect();
          if (heading.getBoundingClientRect().top < toolbar.bottom - tolerance) issues.push('Heading is behind the toolbar.');
          const blocks = slide.querySelectorAll<HTMLElement>(
            'h1,h2,h3,p,pre,figure,figcaption,blockquote,ol,li,.contrast,.skills-list,.thesis-path,.workflow-path,[data-diagram]');
          let blockCount = 0;
          for (const block of blocks) {
            if (block.closest('.notes') || !visible(block)) continue;
            const bounds = block.getBoundingClientRect();
            if (!bounds.width || !bounds.height) continue;
            blockCount++;
            if (bounds.left < -tolerance || bounds.right > innerWidth + tolerance ||
                (!reading && bounds.bottom > innerHeight - tolerance)) {
              issues.push(`${block.tagName} outside the slide: ${block.textContent?.trim().slice(0, 55)}`);
            }
            if (block.tagName === 'PRE' && !block.hasAttribute('data-preserve-layout') &&
                block.scrollWidth > block.clientWidth + 1) issues.push('Ordinary code needs horizontal scrolling.');
          }
          for (const code of slide.querySelectorAll<HTMLElement>('code:not(.hljs)')) {
            if (!visible(code)) continue;
            const container = code.parentElement!.getBoundingClientRect();
            for (const bounds of code.getClientRects()) {
              if (bounds.width && (bounds.left < container.left - tolerance || bounds.right > container.right + tolerance)) {
                issues.push(`Inline code exceeds its container: ${code.textContent}`);
              }
            }
          }
          let textCount = 0;
          const metricsContext = document.createElement('canvas').getContext('2d')!;
          const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.textContent?.trim()) continue;
            const parent = node.parentElement!;
            if (parent.closest('svg, .notes') || !visible(parent)) continue;
            let container: HTMLElement | null = parent.closest('pre,h1,h2,h3,p,li,figcaption,blockquote');
            while (container && !container.getBoundingClientRect().width) container = container.parentElement;
            container ??= parent;
            if (!container.getBoundingClientRect().width) continue;
            const bounds = container.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(node);
            const rects = [...range.getClientRects()].filter((rect) => rect.width && rect.height);
            if (!rects.length) continue;
            const textStyle = getComputedStyle(parent);
            metricsContext.font = `${textStyle.fontStyle} ${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`;
            const metrics = metricsContext.measureText(node.textContent);
            // Range boxes include font leading, not just visible glyphs. Check rendered ink inside the line/container.
            textCount++;
            for (const rect of rects) {
              const preservedCode = container.tagName === 'PRE' && container.hasAttribute('data-preserve-layout');
              const scale = rect.height / (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent);
              const inkTop = rect.top + (metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent) * scale;
              const inkBottom = rect.bottom - (metrics.fontBoundingBoxDescent - metrics.actualBoundingBoxDescent) * scale;
              if ((!preservedCode && (rect.left < bounds.left - tolerance || rect.right > bounds.right + tolerance)) ||
                  (container.tagName !== 'PRE' && (inkTop < bounds.top - tolerance || inkBottom > bounds.bottom + tolerance))) {
                issues.push(`Text exceeds its container: ${node.textContent.trim().slice(0, 55)}`);
                break;
              }
            }
          }
          const svg = slide.querySelector<SVGSVGElement>('.architecture-svg');
          let nodeCount = 0;
          let labelCount = 0;
          if (svg && visible(svg)) {
            for (const node of svg.querySelectorAll<SVGGElement>('.graph-node')) {
              const rect = node.querySelector<SVGRectElement>('rect')!.getBBox();
              if (!rect.width || !rect.height) {
                issues.push('SVG node measured zero while its graph is active.');
                continue;
              }
              nodeCount++;
              const labels = [...node.querySelectorAll<SVGTextElement>('text')];
              const icon = node.querySelector<SVGSVGElement>('svg')!;
              const iconBox = icon.getBBox();
              const matrix = node.getCTM()!.inverse().multiply(icon.getCTM()!);
              const iconRight = new DOMPoint(iconBox.x + iconBox.width, iconBox.y).matrixTransform(matrix).x;
              let previousBottom = 0;
              for (const label of labels) {
                const box = label.getBBox();
                labelCount++;
                if (!box.width || !box.height) issues.push(`Active SVG label measured zero: ${label.textContent}`);
                const left = label.classList.contains('node-title') ? iconRight + 10 : rect.x + 18;
                if (box.x < left - 1 || box.x + box.width > rect.x + rect.width - 18 + 1 ||
                    box.y < rect.y + 12 - 1 || box.y + box.height > rect.y + rect.height - 12 + 1) {
                  issues.push(`SVG label exceeds padded node ${node.dataset.node}: ${label.textContent} ` +
                    JSON.stringify({
                      label: { x: box.x, y: box.y, width: box.width, height: box.height },
                      paddedNode: { left, right: rect.x + rect.width - 18, top: rect.y + 12, bottom: rect.y + rect.height - 12 },
                    }));
                }
                if (box.y < previousBottom + 3 - 1) issues.push(`SVG subtitle overlaps another line: ${label.textContent}`);
                previousBottom = box.y + box.height;
                if (parseFloat(getComputedStyle(label).fontSize) < 20) issues.push('SVG font was shrunk instead of fitting.');
              }
            }
          }
          return { id: slide.id, issues, blockCount, textCount, nodeCount, labelCount };
        });
        results.push(result);
        expect(result.blockCount, `${id} must be actively measured`).toBeGreaterThan(0);
        expect(result.textCount, `${id} must include actual text-range checks`).toBeGreaterThan(0);
      }
      await testInfo.attach('all-slide-fit-audit', {
        body: JSON.stringify({ theme, viewport, results }, null, 2),
        contentType: 'application/json',
      });
      expect(results.flatMap((result) => result.issues.map((issue) => `${result.id}: ${issue}`))).toEqual([]);
      if (viewport.mode === 'present') {
        expect(results.reduce((count, result) => count + result.nodeCount, 0)).toBe(31);
        expect(results.reduce((count, result) => count + result.labelCount, 0)).toBe(66);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

for (const theme of ['light', 'dark'] as const) {
  for (const width of [320, 375, 386, 390, 394, 414]) {
    test(`feature and long identifiers fit their rendered ${theme} ${width}px container`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit narrow theme/width regression matrix runs once.');
      await openDeck(page, theme, width, 844, 'read');
      await page.evaluate(() => { window.location.hash = '/browser-evidence'; });
      await expect(page.locator('#browser-evidence h2')).toBeInViewport();
      const identifier = page.locator('#browser-evidence .identifier');
      for (const expected of ['WithBrowserLogs', 'ASPIRE_CLI_START_TIMEOUT']) {
        if (expected.startsWith('ASPIRE_')) {
          await identifier.locator('code').evaluate((code) => {
            code.replaceChildren('ASPIRE_', document.createElement('wbr'), 'CLI_',
              document.createElement('wbr'), 'START_', document.createElement('wbr'), 'TIMEOUT');
          });
        }
        await expect(identifier).toHaveText(expected);
        const geometry = await identifier.evaluate((element) => {
          const container = element.getBoundingClientRect();
          const code = element.querySelector('code')!;
          const range = document.createRange();
          range.selectNodeContents(code);
          return {
            overflow: element.scrollWidth - element.clientWidth,
            right: container.right,
            rangeRight: Math.max(...[...range.getClientRects()].map((rect) => rect.right)),
            codeRight: Math.max(...[...code.getClientRects()].map((rect) => rect.right)),
            text: code.textContent,
          };
        });
        expect(geometry.overflow).toBe(0);
        expect(geometry.rangeRight).toBeLessThanOrEqual(geometry.right + 0.5);
        expect(geometry.codeRight).toBeLessThanOrEqual(geometry.right + 0.5);
        expect(geometry.text).toBe(expected);
      }
    });
  }
}

for (const theme of ['light', 'dark'] as const) {
  test(`padded inline code fits with a wider platform monospace font in ${theme}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit font/theme regression runs once.');
    for (const width of [320, 390, 790]) {
      await openDeck(page, theme, width, 844, 'read');
      await page.addStyleTag({ content: '.reveal :not(pre) > code:not(.hljs) { font-family: monospace; }' });
      await page.evaluate(() => document.fonts.ready);
      for (const id of ['skills', 'browser-evidence']) {
        await page.evaluate((slideId) => { location.hash = `/${slideId}`; }, id);
        await expect(page.locator(`#${id} h2`)).toBeInViewport();
        const results = await page.locator(`#${id} code:not(.hljs)`).evaluateAll((codes) => codes.map((code) => {
          const container = code.parentElement!;
          const bounds = container.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(code);
          return {
            text: code.textContent,
            containerOverflow: container.scrollWidth - container.clientWidth,
            codeOverflow: code.scrollWidth - code.clientWidth,
            fits: [...code.getClientRects(), ...range.getClientRects()].every((rect) =>
              rect.left >= bounds.left - 0.5 && rect.right <= bounds.right + 0.5),
          };
        }));
        expect(results.length).toBeGreaterThan(0);
        for (const result of results) {
          expect(result.containerOverflow, result.text ?? '').toBe(0);
          expect(result.codeOverflow, result.text ?? '').toBe(0);
          expect(result.fits, `${id} ${width}px: ${result.text}`).toBe(true);
        }
      }
    }
  });
}

test('every graph edge waits for both rendered endpoints through all forward and back states', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Both wide light/dark graphs are tested directly; narrow views redraw all stages.');
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const states = [];
  for (const id of ['the-loop', 'compiler', 'docs-supply', 'api-index']) {
    await page.goto(`?mode=present#/${id}`);
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await page.evaluate(() => document.fonts.ready);
    const graph = page.locator(`#${id} .architecture-svg`);
    const steps = Number(await page.locator(`#${id} [data-diagram]`).getAttribute('data-steps'));
    const walk = [0, ...Array.from({ length: steps }, (_, index) => index + 1),
      ...Array.from({ length: steps }, (_, index) => steps - index - 1)];
    let previous = 0;
    for (const step of walk) {
      if (step > previous) await page.locator('#next').click();
      if (step < previous) await page.locator('#previous').click();
      previous = step;
      await expect(graph.locator('.fragment.visible')).toHaveCount(step);
      await expect.poll(() => graph.locator('.graph-stage').evaluateAll((groups) =>
        groups.every((group) => !group.classList.contains('fragment') ||
          Number(getComputedStyle(group).opacity) === (group.classList.contains('visible') ? 1 : 0)))).toBe(true);
      const state = await graph.evaluate((svg) => {
        function opacity(element: Element) {
          let value = 1;
          for (let parent: Element | null = element; parent; parent = parent.parentElement) {
            const style = getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden') return 0;
            value *= Number(style.opacity);
          }
          return value;
        }
        const nodes = new Map([...svg.querySelectorAll<SVGElement>('[data-node]')]
          .map((node) => [node.dataset.node, opacity(node.querySelector('rect')!)]));
        const edges = [...svg.querySelectorAll<SVGElement>('.graph-edge')].map((edge) => {
          const path = edge.querySelector<SVGPathElement>('.edge-path')!;
          const markerId = path.getAttribute('marker-end')!.slice(5, -1);
          const marker = document.getElementById(markerId)!.querySelector('path')!;
          const style = getComputedStyle(path);
          const visible = opacity(path) > 0 && style.stroke !== 'none' && Number(style.strokeOpacity) > 0;
          return {
            from: edge.dataset.from, to: edge.dataset.to, visible,
            sourceVisible: (nodes.get(edge.dataset.from) ?? 0) > 0,
            targetVisible: (nodes.get(edge.dataset.to) ?? 0) > 0,
            markerDrawn: getComputedStyle(marker).stroke !== 'none',
            labelVisible: !!edge.querySelector('text') && opacity(edge.querySelector('text')!) > 0,
            returnEdge: edge.classList.contains('return'),
          };
        });
        const strayPaths = [...svg.querySelectorAll('path')].filter((path) =>
          !path.closest('defs, .graph-node, .graph-edge') && opacity(path) > 0 &&
          (getComputedStyle(path).stroke !== 'none' || getComputedStyle(path).fill !== 'none')).length;
        return { edges, strayPaths, nodesVisible: [...nodes.values()].filter((value) => value > 0).length };
      });
      states.push({ id, step, ...state });
      expect(state.strayPaths, `${id} stage ${step}: no pre-revealed guide or return path`).toBe(0);
      if (step === 0) expect(state.edges.filter((edge) => edge.visible)).toEqual([]);
      for (const edge of state.edges) {
        expect(!edge.visible || (edge.sourceVisible && edge.targetVisible),
          `${id} ${step}: ${edge.from} -> ${edge.to} points to a hidden node`).toBe(true);
        expect(!edge.labelVisible || edge.visible).toBe(true);
        if (edge.visible) expect(edge.markerDrawn).toBe(true);
      }
      if (step === steps) {
        expect(state.edges.every((edge) => edge.visible)).toBe(true);
        expect(state.nodesVisible).toBe(Number(await graph.locator('.graph-node').count()));
      }
    }
  }
  expect(states).toHaveLength(38);
  await testInfo.attach('all-graph-fragment-states', {
    body: JSON.stringify(states, null, 2), contentType: 'application/json',
  });
});

for (const mode of ['reduced-motion', 'read', 'print'] as const) {
  test(`all four ${mode} graphs expose complete rendered nodes and connections`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'Static completeness is explicitly checked once for each mode.');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference' });
    await page.goto(mode === 'print' ? '?print-pdf' : `?mode=${mode === 'read' ? 'read' : 'present'}`);
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await page.evaluate(() => document.fonts.ready);
    for (const id of ['the-loop', 'compiler', 'docs-supply', 'api-index']) {
      if (mode !== 'print') await page.evaluate((slideId) => { location.hash = `/${slideId}`; }, id);
      const result = await page.locator(`#${id} .architecture-svg`).evaluate((svg) =>
        [...svg.querySelectorAll('.graph-node rect, .graph-edge .edge-path, .graph-edge text')].map((element) => {
          let opacity = 1;
          for (let parent: Element | null = element; parent; parent = parent.parentElement) {
            const style = getComputedStyle(parent);
            if (style.visibility === 'hidden' || style.display === 'none') return false;
            opacity *= Number(style.opacity);
          }
          return opacity === 1;
        }));
      expect(result.length).toBeGreaterThan(10);
      expect(result.every(Boolean), `${mode} ${id} must show all nodes and connectors`).toBe(true);
    }
  });
}

for (const width of [320, 390, 790, 1280]) {
  test(`workflow strip is a centered intrinsic group at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Explicit light/dark viewport geometry covers the narrow strip.');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('#/workflow');
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await page.evaluate(() => document.fonts.ready);
    const result = await page.locator('#workflow .workflow-path').evaluate((group) => {
      const bounds = group.getBoundingClientRect();
      const slide = group.closest('section')!.getBoundingClientRect();
      const pills = [...group.querySelectorAll('code')].map((pill) => {
        const range = document.createRange();
        range.selectNodeContents(pill);
        return { box: pill.getBoundingClientRect().toJSON(), text: range.getBoundingClientRect().toJSON() };
      });
      const children = [...group.children].map((child) => child.getBoundingClientRect());
      const vertical = getComputedStyle(group).flexDirection === 'column';
      return {
        centerGap: Math.abs(bounds.x + bounds.width / 2 - slide.x - slide.width / 2),
        width: bounds.width, slideWidth: slide.width, pills, vertical,
        gaps: children.slice(1).map((child, index) =>
          vertical ? child.top - children[index].bottom : child.left - children[index].right),
        codeAlignment: getComputedStyle(group.closest('section')!.querySelector('pre')!).textAlign,
      };
    });
    expect(result.centerGap).toBeLessThanOrEqual(1);
    expect(result.pills).toHaveLength(3);
    expect(result.width).toBeLessThan(result.slideWidth * 0.95);
    for (const pill of result.pills) {
      expect(Math.abs(pill.box.x + pill.box.width / 2 - pill.text.x - pill.text.width / 2)).toBeLessThanOrEqual(1);
    }
    expect(Math.max(...result.gaps) - Math.min(...result.gaps)).toBeLessThanOrEqual(1);
    expect(Math.min(...result.gaps)).toBeGreaterThan(8);
    expect(result.codeAlignment).toBe('left');
    if (width < 600) expect(result.vertical).toBe(true);
  });
}
