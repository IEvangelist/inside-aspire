// Captures the PR proof images from the live, public GitHub pages.
// Content is never edited: unrelated timeline rows and page chrome are hidden (elision only).
// Usage (from deck/): node scripts/capture-pr-proof.mjs
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const shots = [
  {
    // The feature merges, then the docs bot reports the PR it opened.
    name: 'product-pr',
    url: 'https://github.com/microsoft/aspire/pull/16531',
    opening: false,
    rows: ['merged commit 49e4797', 'Pull request created: #775'],
  },
  {
    // The bot drafts and asks the feature author for review; he refines it.
    name: 'docs-pr',
    url: 'https://github.com/microsoft/aspire.dev/pull/775',
    opening: true,
    rows: ['requested a review from David Fowler', 'Move browser logs to integrations/devtools'],
    drop: ['Content for Aspire release'],
  },
];

const browser = await chromium.launch();
for (const shot of shots) {
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 800, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme });
    await page.goto(shot.url, { waitUntil: 'networkidle' });
    const clip = await page.evaluate(({ opening, rows, drop = [] }) => {
      // Render every timestamp as an absolute date, so the excerpt doesn't age ("7 months ago").
      for (const time of document.querySelectorAll('relative-time')) {
        time.setAttribute('format', 'datetime');
        time.setAttribute('prefix', 'on');
        time.setAttribute('year', 'numeric');
        time.setAttribute('month', 'short');
        time.setAttribute('day', 'numeric');
        time.setAttribute('weekday', '');
        for (const name of ['hour', 'minute', 'second', 'time-zone-name']) time.removeAttribute(name);
      }
      const discussion = document.querySelector('.js-discussion');
      let timeline = discussion.children[1];
      while (timeline.children.length < 3) {
        timeline = [...timeline.children].sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
      }
      // Timeline rows group events; keep only the groups and events that contain a needle.
      const text = (element) => element.textContent.replace(/\s+/g, ' ');
      const has = (element) => rows.some((needle) => text(element).includes(needle)) && !drop.some((needle) => text(element).includes(needle));
      for (const needle of rows) {
        if (![...timeline.children].some((child) => text(child).includes(needle))) throw new Error(`Missing timeline row: ${needle}`);
      }
      for (const group of timeline.children) {
        if (!has(group)) { group.style.display = 'none'; continue; }
        if (group.children.length > 1) for (const event of group.children) if (!has(event)) event.style.display = 'none';
      }
      [...discussion.children].slice(2).forEach((child) => { child.style.display = 'none'; });
      if (!opening) discussion.children[0].style.display = 'none';
      const body = discussion.children[0].querySelector('.comment-body');
      if (opening && body) [...body.children].slice(2).forEach((child) => { child.style.display = 'none'; });
      for (const selector of ['#partial-discussion-sidebar', '.discussion-timeline-actions', '.gh-header-sticky', '.js-sticky-is-stuck',
        '[class*="PageHeader-Navigation"]', '[class*="PageHeader-Actions"]', '[class*="PageLayout-Pane"]']) {
        for (const element of document.querySelectorAll(selector)) element.style.display = 'none';
      }
      for (const element of document.querySelectorAll('[class*="PageLayout-Content"]')) element.style.maxWidth = 'none';
      const title = document.querySelector('header[class*="PageLayout-Header"]') ?? document.querySelector('h1');
      const header = title.getBoundingClientRect();
      const bounds = discussion.getBoundingClientRect();
      const top = header.top + scrollY - 12;
      const left = Math.max(0, Math.min(header.left, bounds.left) - 12);
      const right = Math.min(innerWidth, Math.max(header.right, bounds.right) + 12);
      return { x: left, y: top, width: right - left, height: bounds.bottom + scrollY - top + 4 };
    }, shot);
    const png = await page.screenshot({ clip, fullPage: true });
    const webp = await page.evaluate(async (data) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = Object.assign(document.createElement('canvas'), { width: image.width, height: image.height });
      canvas.getContext('2d').drawImage(image, 0, 0);
      return canvas.toDataURL('image/webp', 0.9).split(',')[1];
    }, png.toString('base64'));
    await writeFile(new URL(`../public/proof/${shot.name}-${scheme}.webp`, import.meta.url), Buffer.from(webp, 'base64'));
    console.log(`${shot.name}-${scheme}: ${Math.round(clip.width)}x${Math.round(clip.height)} css px`);
    await page.close();
  }
}
await browser.close();
