import { expect, test, type Page } from '@playwright/test';

const graphSlides = ['the-loop', 'compiler', 'docs-supply', 'api-index'] as const;

async function inspectConnectors(page: Page, id: string) {
  await page.evaluate((slideId) => { location.hash = `/${slideId}`; }, id);
  const heading = page.locator(`#${id} h2`);
  if (await page.locator('.pdf-page').count()) await heading.scrollIntoViewIfNeeded();
  await expect(heading).toBeInViewport();
  await page.evaluate(() => document.fonts.ready);
  return page.locator(`#${id} .architecture-svg`).evaluate((element) => {
    if (!(element instanceof SVGSVGElement)) throw new Error('Expected an active architecture SVG.');
    const svg = element;
    const svgMatrix = svg.getCTM()!.inverse();
    type Box = { left: number; right: number; top: number; bottom: number };
    function box(graphic: SVGGraphicsElement): Box {
      const bounds = graphic.getBBox();
      if (!bounds.width || !bounds.height) throw new Error('Cannot audit zero-sized inactive graph geometry.');
      const matrix = svgMatrix.multiply(graphic.getCTM()!);
      const first = new DOMPoint(bounds.x, bounds.y).matrixTransform(matrix);
      const last = new DOMPoint(bounds.x + bounds.width, bounds.y + bounds.height).matrixTransform(matrix);
      return { left: first.x, right: last.x, top: first.y, bottom: last.y };
    }
    function inside(point: { x: number; y: number }, bounds: Box, margin = 0) {
      return point.x > bounds.left - margin && point.x < bounds.right + margin &&
        point.y > bounds.top - margin && point.y < bounds.bottom + margin;
    }
    function boundary(point: { x: number; y: number }, bounds: Box) {
      const sides = [
        { matches: Math.abs(point.x - bounds.left) < 0.1, normal: { x: -1, y: 0 } },
        { matches: Math.abs(point.x - bounds.right) < 0.1, normal: { x: 1, y: 0 } },
        { matches: Math.abs(point.y - bounds.top) < 0.1, normal: { x: 0, y: -1 } },
        { matches: Math.abs(point.y - bounds.bottom) < 0.1, normal: { x: 0, y: 1 } },
      ];
      if (point.x < bounds.left - 0.1 || point.x > bounds.right + 0.1 ||
          point.y < bounds.top - 0.1 || point.y > bounds.bottom + 0.1) return undefined;
      return sides.find((side) => side.matches)?.normal;
    }
    const nodes = new Map([...svg.querySelectorAll<SVGRectElement>('.graph-node > rect')]
      .map((rect) => [rect.parentElement!.getAttribute('data-node')!, box(rect)]));
    const edges = [...svg.querySelectorAll<SVGGElement>('.graph-edge')].map((edge) => {
      const from = edge.getAttribute('data-from')!;
      const to = edge.getAttribute('data-to')!;
      const path = edge.querySelector<SVGPathElement>('.edge-path')!;
      const matrix = svgMatrix.multiply(path.getCTM()!);
      const length = path.getTotalLength();
      if (!length) throw new Error(`Cannot audit an empty connection: ${from} -> ${to}`);
      function point(distance: number) {
        const position = path.getPointAtLength(distance).matrixTransform(matrix);
        return { x: position.x, y: position.y };
      }
      const start = point(0);
      const end = point(length);
      const first = point(Math.min(1, length));
      const last = point(Math.max(0, length - 1));
      const tangent = { x: end.x - last.x, y: end.y - last.y };
      const magnitude = Math.hypot(tangent.x, tangent.y);
      const direction = { x: tangent.x / magnitude, y: tangent.y / magnitude };
      const markerId = path.getAttribute('marker-end')!.slice(5, -1);
      const marker = svg.querySelector<SVGMarkerElement>(`#${markerId}`)!;
      const head = marker.querySelector<SVGPathElement>('path')!;
      const headBox = head.getBBox();
      const stroke = parseFloat(getComputedStyle(head).strokeWidth) / 2;
      const corners = [
        [headBox.x, headBox.y], [headBox.x + headBox.width, headBox.y],
        [headBox.x, headBox.y + headBox.height], [headBox.x + headBox.width, headBox.y + headBox.height],
      ].map(([x, y]) => {
        const along = x - marker.refX.baseVal.value;
        const across = y - marker.refY.baseVal.value;
        return { x: end.x + along * direction.x - across * direction.y,
          y: end.y + along * direction.y + across * direction.x };
      });
      const arrow = {
        left: Math.min(...corners.map((corner) => corner.x)) - stroke,
        right: Math.max(...corners.map((corner) => corner.x)) + stroke,
        top: Math.min(...corners.map((corner) => corner.y)) - stroke,
        bottom: Math.max(...corners.map((corner) => corner.y)) + stroke,
      };
      const samples = Array.from({ length: Math.ceil(length / 2) + 1 }, (_, index) =>
        point(Math.min(index * 2, length)));
      const label = edge.querySelector<SVGTextElement>('.edge-label');
      const halfGap = Math.abs(end.x - start.x) / 2;
      return { from, to, start, end, first, last, length, arrow, samples,
        firstElbow: point(Math.min(halfGap, length)), lastElbow: point(Math.max(0, length - halfGap)),
        beforeHead: point(Math.max(0, length - 16)), label: label ? box(label) : undefined,
        returnEdge: edge.classList.contains('return') };
    });
    const issues: string[] = [];
    const view = svg.viewBox.baseVal;
    for (const edge of edges) {
      const source = nodes.get(edge.from)!;
      const target = nodes.get(edge.to)!;
      const sourceNormal = boundary(edge.start, source);
      const targetNormal = boundary(edge.end, target);
      const name = `${edge.from} -> ${edge.to}`;
      if (!sourceNormal || !targetNormal) issues.push(`${name}: endpoint is not on its node boundary`);
      if (sourceNormal && (edge.first.x - edge.start.x) * sourceNormal.x +
          (edge.first.y - edge.start.y) * sourceNormal.y <= 0) issues.push(`${name}: source points into its box`);
      if (targetNormal && (edge.end.x - edge.last.x) * targetNormal.x +
          (edge.end.y - edge.last.y) * targetNormal.y >= 0) issues.push(`${name}: arrow arrives from inside its box`);
      if (edge.arrow.left < 0 || edge.arrow.top < 0 ||
          edge.arrow.right > view.width || edge.arrow.bottom > view.height) issues.push(`${name}: arrowhead exceeds viewBox`);
      if (edge.samples.some((point) => point.x < 0 || point.y < 0 || point.x > view.width || point.y > view.height)) {
        issues.push(`${name}: path exceeds viewBox`);
      }
      for (const [nodeId, bounds] of nodes) {
        if (nodeId !== edge.from && nodeId !== edge.to && edge.samples.some((point) => inside(point, bounds, 6))) {
          issues.push(`${name}: path crosses or crowds unrelated ${nodeId}`);
        }
      }
      const horizontal = edge.samples.every((point) => Math.abs(point.y - edge.start.y) < 0.1);
      if (horizontal && (Math.abs(edge.start.y - (source.top + source.bottom) / 2) > 0.5 ||
          Math.abs(edge.end.y - (target.top + target.bottom) / 2) > 0.5)) {
        issues.push(`${name}: straight horizontal connection misses a node center`);
      }
      const vertical = edge.samples.every((point) => Math.abs(point.x - edge.start.x) < 0.1);
      if (vertical && !edge.returnEdge && edges.filter((other) => other.from === edge.from).length === 1 &&
          edges.filter((other) => other.to === edge.to).length === 1 &&
          (Math.abs(edge.start.x - (source.left + source.right) / 2) > 0.5 ||
           Math.abs(edge.end.x - (target.left + target.right) / 2) > 0.5)) {
        issues.push(`${name}: straight vertical connection misses a node center`);
      }
      const finalHorizontal = Math.abs(edge.end.y - edge.last.y) < 0.1;
      if (finalHorizontal ? Math.abs(edge.beforeHead.y - edge.end.y) > 0.1 :
          Math.abs(edge.beforeHead.x - edge.end.x) > 0.1) issues.push(`${name}: final elbow crowds its arrowhead`);
      if (edge.label) {
        const label = edge.label;
        if (label.left < 5 || label.top < 5 || label.right > view.width - 5 || label.bottom > view.height - 5) {
          issues.push(`${name}: edge label exceeds viewBox`);
        }
        for (const [nodeId, bounds] of nodes) {
          if (label.left - 5 < bounds.right && label.right + 5 > bounds.left &&
              label.top - 5 < bounds.bottom && label.bottom + 5 > bounds.top) {
            issues.push(`${name}: edge label crowds ${nodeId}`);
          }
        }
        for (const other of edges) {
          if (other.samples.some((point) => inside(point, label, 5))) {
            issues.push(`${name}: edge label intersects ${other.from} -> ${other.to}`);
          }
        }
      }
    }
    for (const nodeId of nodes.keys()) {
      const incoming = edges.filter((edge) => edge.to === nodeId);
      for (let first = 0; first < incoming.length; first++) {
        for (let second = first + 1; second < incoming.length; second++) {
          const left = incoming[first];
          const right = incoming[second];
          const spread = Math.hypot(left.end.x - right.end.x, left.end.y - right.end.y);
          const clearance = Math.hypot(
            Math.max(0, left.arrow.left - right.arrow.right, right.arrow.left - left.arrow.right),
            Math.max(0, left.arrow.top - right.arrow.bottom, right.arrow.top - left.arrow.bottom));
          if (spread < 20 || clearance < 8) issues.push(`${nodeId}: inbound arrowheads crowd (${spread}, ${clearance})`);
        }
      }
    }
    let fanIn;
    if (svg.dataset.graph === 'api') {
      const roslyn = nodes.get('roslyn')!;
      const inputs = ['dll', 'xml', 'pdb'].map((from) => {
        const edge = edges.find((connection) => connection.from === from && connection.to === 'roslyn')!;
        const source = nodes.get(from)!;
        if (Math.abs(edge.start.y - (source.top + source.bottom) / 2) > 0.1) {
          issues.push(`${from}: fan-in starts away from input center`);
        }
        return edge;
      });
      const [top, middle, bottom] = inputs;
      const topGap = middle.end.y - top.end.y;
      const bottomGap = bottom.end.y - middle.end.y;
      if (Math.abs(topGap - bottomGap) > 0.1 || Math.min(topGap, bottomGap) < 20) {
        issues.push(`API fan-in is not an evenly separated symmetric trio (${topGap}, ${bottomGap})`);
      }
      if (Math.abs(middle.start.y - middle.end.y) > 0.1 ||
          Math.abs(middle.end.y - (roslyn.top + roslyn.bottom) / 2) > 0.1 ||
          Math.abs(middle.length - (middle.end.x - middle.start.x)) > 0.1) {
        issues.push('API middle connection is not a straight shared centerline');
      }
      for (const edge of [top, bottom]) {
        const elbowX = (edge.start.x + edge.end.x) / 2;
        if (Math.abs(edge.firstElbow.x - elbowX) > 0.1 || Math.abs(edge.lastElbow.x - elbowX) > 0.1 ||
            Math.abs(edge.firstElbow.y - edge.start.y) > 0.1 || Math.abs(edge.lastElbow.y - edge.end.y) > 0.1) {
          issues.push(`${edge.from}: fan-in elbows are not orthogonal at the midpoint of the node gap`);
        }
      }
      fanIn = { sourceCenters: inputs.map((edge) => edge.start.y), ports: inputs.map((edge) => edge.end.y), topGap, bottomGap };
    }
    return { graph: svg.dataset.graph, issues, nodes: nodes.size, edges: edges.map(({ samples, ...edge }) => edge), fanIn };
  });
}

for (const theme of ['light', 'dark'] as const) {
  for (const viewport of [
    { width: 1280, height: 720, mode: 'present' },
    { width: 1024, height: 768, mode: 'present' },
    { width: 1024, height: 576, mode: 'present' },
    { width: 1280, height: 720, mode: 'read' },
    { width: 1440, height: 900, mode: 'print' },
  ] as const) {
    test(`all 32 connectors fit ${theme} ${viewport.width}x${viewport.height} ${viewport.mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-dark', 'The explicit rendered geometry/theme/mode matrix runs once.');
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
      await page.goto(`?theme=${theme}&${viewport.mode === 'print' ? 'print-pdf' : `mode=${viewport.mode}`}`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      const audits = [];
      for (const id of graphSlides) {
        audits.push(await inspectConnectors(page, id));
        if (viewport.width === 1280 && viewport.mode === 'present') {
          const imagePath = testInfo.outputPath(`${id}.png`);
          await page.locator(`#${id} .architecture-svg`).screenshot({ path: imagePath });
          await testInfo.attach(`${id}-routing`, {
            path: imagePath, contentType: 'image/png',
          });
        }
      }
      await testInfo.attach('rendered-connector-geometry', {
        body: JSON.stringify({ theme, viewport, audits }, null, 2), contentType: 'application/json',
      });
      expect(audits.reduce((count, audit) => count + audit.nodes, 0)).toBe(31);
      expect(audits.reduce((count, audit) => count + audit.edges.length, 0)).toBe(32);
      expect(audits.flatMap((audit) => audit.issues.map((issue) => `${audit.graph}: ${issue}`))).toEqual([]);
    });
  }
  for (const width of [320, 390]) {
    test(`all connector relationships remain legible in ${theme} ${width}px reading`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-dark', 'Explicit narrow light/dark graph fallbacks are measured once.');
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(`?theme=${theme}&mode=read`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      await page.evaluate(() => document.fonts.ready);
      for (const id of graphSlides) {
        await page.evaluate((slideId) => { location.hash = `/${slideId}`; }, id);
        await expect(page.locator(`#${id} h2`)).toBeInViewport();
        await expect(page.locator(`#${id} .architecture-svg`)).toBeHidden();
        const result = await page.locator(`#${id}`).evaluate((slide) => {
          const ids = [...slide.querySelectorAll('[data-node]')].map((node) => node.getAttribute('data-node'));
          const rows = [...slide.querySelectorAll<HTMLElement>('[data-mobile-node]')];
          return {
            ids, mobileIds: rows.map((row) => row.dataset.mobileNode),
            relations: rows.reduce((count, row) => count + (row.querySelector('small')!.textContent!.match(/To /g)?.length ?? 0), 0),
            edgeCount: slide.querySelectorAll('.graph-edge').length,
            fits: rows.every((row) => row.getBoundingClientRect().left >= 0 &&
              row.getBoundingClientRect().right <= innerWidth && row.scrollWidth === row.clientWidth),
          };
        });
        expect([...result.mobileIds].sort()).toEqual([...result.ids].sort());
        expect(result.relations).toBe(result.edgeCount);
        expect(result.fits).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}
