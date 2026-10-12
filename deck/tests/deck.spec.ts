import AxeBuilder from '@axe-core/playwright';
import { expect,test,type Page } from '@playwright/test';

const slideCount=41;

async function ready(page: Page,path='') {
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready','true');
}

async function openMenu(page: Page) {
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#deck-menu')).toBeVisible();
}

test('loads local assets, actual slide content, and readable mobile text',async ({ page },testInfo) => {
  const failures: string[]=[];
  page.on('pageerror',(error) => failures.push(error.message));
  page.on('response',(response) => {
    if(response.url().includes('/inside-aspire/')&&response.status()>=400) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  await ready(page);
  await expect(page.locator('#intro h1')).toHaveText('Inside Aspire');
  await expect(page.locator('section[id]')).toHaveCount(slideCount);
  await expect(page.locator('#the-loop')).toContainText('Native Aspire CLI');
  await expect(page.locator('#browser-evidence')).toContainText('WithBrowserLogs');
  await expect(page.locator('#docs-supply')).toContainText('Next code change');
  await expect(page.locator('#api-index')).toContainText('Roslyn');
  await expect.poll(() => page.locator('.brand-link img').evaluateAll((images) =>
    images.every((image) => image instanceof HTMLImageElement&&image.complete&&image.naturalWidth>0))).toBe(true);
  if(testInfo.project.name==='mobile') {
    await expect(page.locator('html')).toHaveAttribute('data-reading','true');
    const title=await page.locator('#intro h1').boundingBox();
    expect(title?.height).toBeGreaterThan(42);
    const toolbar=await page.locator('.toolbar').boundingBox();
    expect(title?.y).toBeGreaterThanOrEqual((toolbar?.y??0)+(toolbar?.height??0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  }
  await expect(page.locator('#thesis')).toContainText('Aspire makes AI');
  await expect(page.locator('#close')).toContainText('more efficient.');
  await expect.poll(() => page.locator('.speaker-portrait').evaluate((image) =>
    image instanceof HTMLImageElement&&image.naturalWidth===300&&image.naturalHeight===300)).toBe(true);
  await expect(page.locator('.speaker-portrait')).toBeVisible();
  await expect(page.locator('.speaker-portrait')).toHaveAttribute('alt',/David Pine/);
  await expect(page.locator('.github-brand img')).toHaveCount(4);
  expect(await page.locator('svg.octicon').count()).toBeGreaterThan(50);
  await expect(page.locator('#intro .subtitle')).toHaveText('The Architecture Behind the AI Loop');
  await expect(page.locator('#intro .event')).toContainText('November 17, 2026 at 6pm Central');
  await expect(page.locator('.brand-link img')).toHaveAttribute('src',/aspire-icon-32\.svg$/);
  const mark=await page.locator('.brand-link img').boundingBox();
  expect(mark?.width).toBe(32);
  expect(mark?.height).toBe(32);
  await expect(page.locator('section > .notes')).toHaveCount(slideCount);
  expect(failures).toEqual([]);
});

test('public speaker notes still open from the accessible menu',async ({ page }) => {
  await ready(page);
  await openMenu(page);
  const popupPromise=page.waitForEvent('popup');
  await page.locator('#notes').click();
  const popup=await popupPromise;
  await expect(popup).toHaveTitle('reveal.js - Speaker View');
  await popup.close();
  await expect(page.locator('#deck-menu')).toBeHidden();
});

test('deep links, chapter jumps, theme, reading mode, and keyboard navigation work',async ({ page },testInfo) => {
  await ready(page,'#/the-loop');
  await expect(page.locator('#the-loop')).toBeVisible();
  await openMenu(page);
  await page.locator('[data-slide="skills"]').click();
  await expect(page).toHaveURL(/#\/skills$/);
  await expect(page.locator('#skills h2')).toBeInViewport();
  const previousTheme=await page.locator('html').getAttribute('data-theme');
  await openMenu(page);
  await page.locator('#theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme',previousTheme==='dark'? 'light':'dark');
  await page.getByRole('button',{ name: 'Close presentation menu' }).click();
  if(testInfo.project.name!=='mobile') {
    await page.locator('#presentation').click({ position: { x: 20,y: 20 } });
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/#\/api-index$/);
    await page.keyboard.press('Escape');
    await expect(page.locator('.reveal')).toHaveClass(/overview/);
    await page.keyboard.press('Escape');
    await page.keyboard.press('r');
    await expect(page.locator('html')).toHaveAttribute('data-reading','true');
  }
  await openMenu(page);
  await expect(page.locator('#overview')).toBeDisabled();
  await page.locator('#read-mode').click();
  await expect(page.locator('html')).toHaveAttribute('data-reading','false');
  await openMenu(page);
  await expect(page.locator('#overview')).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('#deck-menu')).toBeHidden();
});

test('keyboard focus and contrast pass the accessibility gate',async ({ page }) => {
  await ready(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#presentation')).toBeFocused();
  const accessibility=await new AxeBuilder({ page })
    .withTags(['wcag2a','wcag2aa','wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await openMenu(page);
  const menuAccessibility=await new AxeBuilder({ page })
    .withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(menuAccessibility.violations).toEqual([]);
});

test('reduced motion and printable view are supported',async ({ page },testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page,'?mode=present#/the-loop');
  await expect(page.locator('html')).toHaveAttribute('data-static','true');
  const duration=await page.locator('#intro').evaluate((element) =>
    Math.max(...getComputedStyle(element).transitionDuration.split(',').map((value) => parseFloat(value))));
  expect(duration).toBeLessThanOrEqual(0.01);
  const invisible=await page.locator('#the-loop .graph-stage').evaluateAll((groups) =>
    groups.filter((group) => getComputedStyle(group).visibility==='hidden'||Number(getComputedStyle(group).opacity)<1).length);
  expect(invisible).toBe(0);
  await page.locator('#next').click();
  await expect(page).toHaveURL(/#\/dashboard$/);
  if(testInfo.project.name!=='mobile') {
    await page.goto('?print-pdf');
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready','true');
    await expect(page.locator('.pdf-page')).toHaveCount(slideCount);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.toolbar')).toBeHidden();
  }
});

test('every desktop slide stays within the presentation viewport',async ({ page },testInfo) => {
  test.skip(testInfo.project.name==='mobile','Mobile uses natural scrolling instead of scaled slides.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  const ids=await page.locator('.slides > section[id]').evaluateAll((slides) => slides.map((slide) => slide.id));
  for(const id of ids) {
    await page.evaluate((slideId) => { window.location.hash=`/${slideId}`; },id);
    await expect(page.locator(`#${id}`)).toHaveClass(/present/);
    const overflow=await page.locator(`#${id}`).evaluate((slide) => {
      const elements=[...slide.querySelectorAll<HTMLElement>('h1,h2,h3,p,pre,figure,table,ol,.skills-list,.contrast,.workflow-path,[data-diagram],.thesis-path')];
      return elements.filter((element) => {
        if(element.closest('.notes')||getComputedStyle(element).display==='none') return false;
        const rect=element.getBoundingClientRect();
        return rect.bottom>window.innerHeight-6||rect.right>window.innerWidth+2||rect.left<-2;
      }).map((element) => `${element.tagName}: ${element.textContent?.trim().slice(0,70)}`);
    });

    expect(overflow,`Slide ${id} overflowed`).toEqual([]);
  }
});

test('all remaining explicit code languages produce real tokens, multiple colors, and safe literal text',async ({ page }) => {
  await ready(page);
  const blocks=await page.locator('pre > code').evaluateAll((codes) => {
    function luminance(color: string) {
      const values=color.match(/[\d.]+/g)?.slice(0,3).map(Number)??[];
      return values.map((value) => {
        const channel=value/255;
        return channel<=0.04045? channel/12.92:((channel+0.055)/1.055)**2.4;
      }).reduce((total,value,index) => total+value*[0.2126,0.7152,0.0722][index],0);
    }
    return codes.map((code) => {
      const tokens=[...code.querySelectorAll<HTMLElement>('span[class*="hljs-"]')];
      const colors=[...new Set([getComputedStyle(code).color,...tokens.map((token) => getComputedStyle(token).color)])];
      const background=luminance(getComputedStyle(code.parentElement!).backgroundColor);
      return {
        language: (code as HTMLElement).dataset.language,
        highlighted: (code as HTMLElement).dataset.highlighted,
        tokens: tokens.length,
        colors: colors.length,
        contrast: Math.min(...colors.map((color) => {
          const foreground=luminance(color);
          return (Math.max(foreground,background)+0.05)/(Math.min(foreground,background)+0.05);
        })),
        tokenBackgrounds: [...new Set(tokens.map((token) => getComputedStyle(token).backgroundColor))],
      };
    });
  });
  expect(blocks.length).toBe(30);
  expect([...new Set(blocks.map((block) => block.language))].sort()).toEqual(
    ['bash','csharp','json','plaintext','powershell','typescript','yaml']);
  for(const block of blocks) {
    expect(block.highlighted,block.language).toBe('true');
    if(block.language==='plaintext') {
      expect(block.tokens).toBe(0);
      expect(block.colors).toBe(1);
      expect(block.tokenBackgrounds).toEqual([]);
    } else {
      expect(block.tokens,block.language).toBeGreaterThan(0);
      expect(block.colors,block.language).toBeGreaterThanOrEqual(2);
      expect(block.tokenBackgrounds).toEqual(['rgba(0, 0, 0, 0)']);
    }
    expect(block.contrast,`${block.language} token contrast`).toBeGreaterThanOrEqual(4.5);
  }
  await expect(page.locator('#api-code .language-json')).toContainText(
    '"id": "csharp/aspire.hosting.browsers/browserlogsbuilderextensions/methods#withbrowserlogs"');
  await expect(page.locator('#runtime-traces .replay-command code')).toContainText(
    "aspire otel traces api --apphost 'demo\\host\\apphost.cs' --format Json --non-interactive");
  await expect(page.locator('#apphost-code')).toContainText('.WithEnvironment("API_HTTPS", "")');
  await expect(page.locator('#apphost-code .code-line')).toHaveCount(12);
});

test('rendered inline code has rounded distinct backgrounds and readable contrast',async ({ page }) => {
  await ready(page,'#/skills');
  const style=await page.locator('.skills-list code').first().evaluate((code) => ({
    radius: parseFloat(getComputedStyle(code).borderRadius),
    background: getComputedStyle(code).backgroundColor,
    foreground: getComputedStyle(code).color,
    slideBackground: getComputedStyle(document.querySelector('.reveal')!).backgroundColor,
    width: code.getBoundingClientRect().width,
    parentWidth: code.parentElement!.getBoundingClientRect().width,
  }));
  expect(style.radius).toBeGreaterThan(0);
  expect(style.background).not.toBe(style.slideBackground);
  expect(style.foreground).not.toBe(style.background);
  expect(style.width).toBeLessThanOrEqual(style.parentWidth+1);
  const accessibility=await new AxeBuilder({ page }).include('#skills').withTags(['wcag2aa']).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('connected SVG graphs have real edges, accessible descriptions, explicit barriers, and closed cycles',async ({ page }) => {
  await ready(page);
  const graphs=await page.locator('.architecture-svg').evaluateAll((svgs) => svgs.map((svg) => ({
    key: (svg as SVGSVGElement).dataset.graph,
    title: svg.querySelector('title')?.textContent,
    description: svg.querySelector('desc')?.textContent,
    nodes: [...svg.querySelectorAll<SVGElement>('[data-node]')].map((node) => node.dataset.node),
    edges: [...svg.querySelectorAll<SVGElement>('[data-from]')].map((edge) => ({
      from: edge.dataset.from,to: edge.dataset.to,
      length: edge.querySelector<SVGPathElement>('path')!.getTotalLength(),
      marker: edge.querySelector('path')!.getAttribute('marker-end'),
    })),
    gates: svg.querySelectorAll('.graph-node.gate').length,
    returns: svg.querySelectorAll('.graph-edge.return').length,
  })));
  expect(graphs.map((graph) => graph.key).sort()).toEqual(['api','inner','outer','runtime']);
  for(const graph of graphs) {
    expect(graph.title?.length).toBeGreaterThan(15);
    expect(graph.description?.length).toBeGreaterThan(100);
    for(const edge of graph.edges) {
      expect(graph.nodes).toContain(edge.from);
      expect(graph.nodes).toContain(edge.to);
      expect(edge.length).toBeGreaterThan(0);
      expect(edge.marker).toContain(`${graph.key}-arrow`);
    }
  }
  for(const key of ['inner','outer']) {
    const graph=graphs.find((candidate) => candidate.key===key)!;
    expect(graph.returns).toBe(1);
    const start=key==='inner'? 'agent':'product';
    function returnsToStart(node: string,visited=new Set<string>()): boolean {
      if(visited.size>3&&node===start) return true;
      if(visited.has(node)) return false;
      return graph.edges.filter((edge) => edge.from===node)
        .some((edge) => returnsToStart(edge.to!,new Set([...visited,node])));
    }
    expect(returnsToStart(start),`${key} cycle must visibly close`).toBe(true);
  }
  expect(graphs.find((graph) => graph.key==='outer')?.gates).toBe(3);
  await expect(page.locator('#compiler')).toContainText('Managed .NET model');
  await expect(page.locator('#api-index')).toContainText('Roslyn');
});

test('speaker advance and back restore graph and code emphasis without background animation',async ({ page },testInfo) => {
  test.skip(testInfo.project.name==='mobile','Narrow screens use the complete readable redraw.');
  await ready(page,'?mode=present#/the-loop');
  await expect(page.locator('#the-loop .fragment.visible')).toHaveCount(0);
  await page.locator('#next').click();
  await expect(page.locator('#the-loop .fragment.visible')).toHaveCount(1);
  const duration=await page.locator('#the-loop .graph-stage.visible .edge-path').first()
    .evaluate((path) => parseFloat(getComputedStyle(path).transitionDuration));
  expect(duration).toBeGreaterThanOrEqual(0.5);
  for(let step=2;step<=5;step++) {
    await page.locator('#next').click();
    await expect(page.locator('#the-loop .fragment.visible')).toHaveCount(step);
  }
  await expect(page.locator('#the-loop .graph-edge.return')).toBeVisible();
  await page.locator('#previous').click();
  await expect(page.locator('#the-loop .fragment.visible')).toHaveCount(4);
  await ready(page,'?mode=present#/parser');
  await page.locator('#next').click();
  await expect(page.locator('#parser-code .is-focused')).toHaveCount(5);
  await page.locator('#next').click();
  await expect(page.locator('#parser-code .is-focused')).toHaveCount(3);
  await page.locator('#previous').click();
  await expect(page.locator('#parser-code .is-focused')).toHaveCount(5);
  await ready(page,'?mode=present#/the-loop/2');
  await expect(page.locator('#the-loop .fragment.visible')).toHaveCount(3);
  await page.evaluate(() => { window.location.hash='/weather'; });
  await expect(page.locator('#weather')).toHaveClass(/present/);
  expect(await page.locator('#the-loop').evaluate((slide) =>
    slide.getAnimations({ subtree: true }).filter((animation) => animation.playState==='running').length)).toBe(0);
});

test('reading mode exposes the complete diagrams and code without waiting for fragments',async ({ page }) => {
  await ready(page,'?mode=read#/the-loop');
  await expect(page.locator('html')).toHaveAttribute('data-static','true');
  await expect(page.locator('html')).toHaveAttribute('data-reading','true');
  await expect(page.locator('#presentation')).toHaveClass(/reveal-scroll/);
  const invisible=await page.locator('#the-loop .fragment').evaluateAll((groups) =>
    groups.filter((group) => getComputedStyle(group).visibility==='hidden'||Number(getComputedStyle(group).opacity)<1).length);
  expect(invisible).toBe(0);
  await openMenu(page);
  await page.locator('[data-slide="live-cli"]').click();
  await expect(page.locator('#live-cli h2')).toBeInViewport();
  await expect(page.locator('#live-cli .language-bash')).toBeVisible();
});

for(const viewport of [
  { width: 320,height: 760 },{ width: 390,height: 844 },{ width: 768,height: 1024 },
  { width: 1024,height: 768 },{ width: 1280,height: 720 },{ width: 1440,height: 900 },
  { width: 1024,height: 600 },
]) {
  test(`responsive surface ${viewport.width}x${viewport.height} keeps controls and evidence readable`,async ({ page },testInfo) => {
    test.skip(testInfo.project.name!=='desktop-dark','Viewport matrix runs once with dark tokens; the other suites exercise light/mobile parity.');
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ready(page);
    const toolbar=await page.locator('.toolbar').boundingBox();
    expect(toolbar?.height).toBeLessThanOrEqual(56);
    for(const selector of ['#previous','#next','#menu-toggle']) {
      const bounds=await page.locator(selector).boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const ids=await page.locator('section[id]').evaluateAll((slides) => slides.map((slide) => slide.id));
    const reading=await page.locator('html').getAttribute('data-reading')==='true';
    for(const id of ids) {
      await page.evaluate((slideId) => {
        const slide=document.getElementById(slideId)!;
        if(document.documentElement.dataset.reading==='true') slide.scrollIntoView({ block: 'start' });
        else window.location.hash=`/${slideId}`;
      },id);
      if(!reading) await expect(page.locator(`#${id}`)).toHaveClass(/present/);
      const overflow=await page.locator(`#${id}`).evaluate((slide) => {
        const targets=[...slide.querySelectorAll<HTMLElement>('h1,h2,p,pre,figure,table,.thesis-path,.contrast,.skills-list,[data-diagram]')];
        return targets.filter((target) => {
          if(target.closest('.notes')||getComputedStyle(target).display==='none') return false;
          const rect=target.getBoundingClientRect();
          return rect.left<-2||rect.right>innerWidth+2||
            (document.documentElement.dataset.reading!=='true'&&rect.bottom>innerHeight-2);
        }).map((target) => target.textContent?.trim().slice(0,65));
      });
      expect(overflow,`${viewport.width}x${viewport.height}: ${id}`).toEqual([]);
    }
    if(reading) {
      const details=page.locator('#the-loop .architecture-mobile strong').first();
      expect(await details.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(18);
    } else {
      const labelSize = await page.locator('#compiler .node-detail').first().evaluate((element) => {
        const label = element as SVGTextElement;
        return parseFloat(getComputedStyle(label).fontSize) * Math.hypot(label.getScreenCTM()!.a, label.getScreenCTM()!.b);
      });
      expect(labelSize).toBeGreaterThanOrEqual(14);
    }
    await openMenu(page);
    const dialog=await page.locator('#deck-menu').boundingBox();
    expect((dialog?.x??0)+(dialog?.width??0)).toBeLessThanOrEqual(viewport.width);
    expect((dialog?.y??0)+(dialog?.height??0)).toBeLessThanOrEqual(viewport.height+1);
  });
}

for (const width of [320, 390, 790]) {
  test(`real inline navigation and Escape focus work at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'Actual pointer/keyboard matrix runs once.');
    await page.setViewportSize({ width, height: 844 });
    await ready(page);
    await expect(page.locator('#presentation')).toHaveClass(/reveal-scroll/);
    await page.getByRole('link', { name: 'Start presentation' }).click();
    await expect(page).toHaveURL(/#\/thesis(?:\/\d+)?$/);
    await expect(page.locator('#thesis h2')).toBeInViewport();
    const heading = await page.locator('#thesis h2').boundingBox();
    const bar = await page.locator('.toolbar').boundingBox();
    expect(heading?.y).toBeGreaterThanOrEqual((bar?.height ?? 0) - 1);
    await openMenu(page);
    await page.getByRole('button', { name: 'Close presentation menu' }).focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('#deck-menu')).toBeHidden();
    await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#menu-toggle')).toBeFocused();
  });
}
