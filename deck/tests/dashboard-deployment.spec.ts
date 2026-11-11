import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

type SourceProof = {
  dashboard: { cli: string; image: string; screenshots: { theme: string; file: string; sha256: string; bytes: number; width: number; height: number }[] };
  deployment: { apiId: string; signature: string };
  versionedContext: { sourcePin: string };
};
const proof: SourceProof = JSON.parse(
  readFileSync(resolve('..', 'docs', 'evidence', 'dashboard-deployment.json'), 'utf8'));
const chapterProof = JSON.parse(readFileSync(resolve('..', 'docs', 'evidence', 'chapter-demos.json'), 'utf8'));

test('plural loops connect real reviewed publication to current narrative and separate versioned API context', async ({ page }) => {
  await page.goto('?mode=present#/stay-current');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await expect(page.locator('#ai-loops .chapter-track h3')).toHaveText(['Product', 'Aspire docs', 'Your app']);
  await expect(page.locator('#stay-current')).toContainText('Narrative docs');
  await expect(page.locator('#stay-current')).toContainText('per package version');
  await expect(page.locator('#stay-current .notes')).toContainText("don't show the CLI matching docs to its own version");
  await expect(page.locator('#stay-current a[href*="PackageJsonGenerator"]')).toHaveAttribute('href',
    new RegExp(`${proof.versionedContext.sourcePin}/src/tools/PackageJsonGenerator/README.md$`));
  await expect(page.locator('#stay-current a[href*="astro.config"]')).toHaveAttribute('href',
    new RegExp(`${proof.versionedContext.sourcePin}/src/frontend/astro.config.mjs$`));
  await expect(page.locator('#the-loop .notes')).toContainText('Skills choose the CLI command');
  await expect(page.locator('#docs-supply .notes')).toContainText('Nothing here trains a model');
  await expect(page.locator('#docs-supply .notes')).toContainText('A maintainer reviews and merges');
});

test('official dashboard screenshots retain exact source hashes and their full aspect in both themes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-dark', 'One exact source/theme/desktop/mobile image matrix suffices.');
  for (const image of proof.dashboard.screenshots) {
    const source = readFileSync(resolve('public', 'dashboard', image.file.split('/').at(-1)!));
    expect(source.length).toBe(image.bytes);
    expect(createHash('sha256').update(source).digest('hex')).toBe(image.sha256);
    for (const viewport of [{ width: 1280, height: 720, mode: 'present' }, { width: 390, height: 844, mode: 'read' }]) {
      await page.setViewportSize(viewport);
      await page.goto(`?theme=${image.theme}&mode=${viewport.mode}#/dashboard-integrated`);
      await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
      await page.evaluate(() => document.fonts.ready);
      const actual = page.locator('#dashboard-integrated .dashboard-image img:visible');
      await expect(actual).toHaveCount(1);
      await expect(actual).toHaveAttribute('src', image.file);
      await expect.poll(() => actual.evaluate((element) =>
        element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
      const geometry = await actual.evaluate((element) => {
        if (!(element instanceof HTMLImageElement)) throw new Error('Expected official source imagery.');
        const bounds = element.getBoundingClientRect();
        return { width: bounds.width, height: bounds.height, right: bounds.right,
          naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight,
          parentWidth: element.parentElement!.getBoundingClientRect().width };
      });
      expect(geometry.naturalWidth).toBe(image.width);
      expect(geometry.naturalHeight).toBe(image.height);
      expect(Math.abs(geometry.width / geometry.height - image.width / image.height)).toBeLessThan(0.01);
      expect(geometry.width).toBeGreaterThanOrEqual(geometry.parentWidth - 1);
      expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
      await expect(page.locator('#dashboard-integrated figcaption')).toContainText('not this weather run');
    }
  }
});

test('dashboard references distinguish AppHost resource service, standalone OTLP and secured startup without fake replay', async ({ page }) => {
  await page.goto('?mode=present#/dashboard-standalone');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  const commands = await page.locator('#dashboard-standalone pre code').allTextContents();
  expect(commands[0]).toBe(proof.dashboard.cli);
  expect(commands[1]).toContain('mcr.microsoft.com/aspire/dashboard:latest');
  for (const ports of ['127.0.0.1:18888:18888', '127.0.0.1:4317:18889', '127.0.0.1:4318:18890']) {
    expect(commands[1]).toContain(ports);
  }
  expect(commands.join('\n')).not.toMatch(/UNSECURED|ALLOW_ANONYMOUS|0\.0\.0\.0|[?&](?:t|token|api[-_]?key)=/i);
  await expect(page.locator('#dashboard-standalone')).toContainText('Reference, not run here');
  await expect(page.locator('#dashboard-standalone')).toContainText("doesn't start or manage your processes");
  await expect(page.locator('#dashboard-standalone .notes')).toContainText('Browser authentication stays on');
  await expect(page.locator('#dashboard-standalone .notes')).toContainText('CLI reference is foreground');
  await expect(page.locator('#dashboard-integrated')).toContainText('reports state, health, console, configuration, and commands');
  await expect(page.locator('#dashboard-signals')).toContainText('Instrument your code, export OTLP');
  await expect(page.locator('#dashboard-signals .notes')).toContainText('not long-term production retention');
  await expect(page.locator('[data-cli-replay]')).toHaveCount(9);
  await expect(page.locator('[id^="dashboard"] [data-cli-replay], [id^="dashboard"] .replay-output')).toHaveCount(0);
});

test('deployment uses the actual Compose target and distinguishes publish from deploy', async ({ page }) => {
  await page.goto('?mode=present#/deployment');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await expect(page.locator('#deployment [data-takeaway]')).toHaveText('Deploy the model you already run.');
  await expect(page.locator('#deployment-model .language-csharp')).toHaveText(
    'builder.AddDockerComposeEnvironment("talk-compose")\n    .WithDashboard(dashboard => dashboard\n        .WithImage("aspire/dashboard", "13.6.2")\n        .WithImageRegistry("mcr.microsoft.com"));');
  expect(proof.deployment.apiId).toContain('dockercomposeenvironmentextensions/methods#adddockercomposeenvironment');
  expect(proof.deployment.signature).toBe('AddDockerComposeEnvironment(IDistributedApplicationBuilder, string)');
  await expect(page.locator('#deployment-model .notes')).toContainText("no-op in a normal run");
  await expect(page.locator('#deployment-publish')).toContainText('No images build and no containers start');
  await expect(page.locator('#deployment-deploy .notes')).toContainText('Deploy evaluates the current model');
  await expect(page.locator('#deployment-deploy .notes')).toContainText('builds the native image and runs Compose');
  await expect(page.locator('#deployment-boundaries .notes')).toContainText('One model still needs target-specific packaging and checks');
  expect(chapterProof.compose.destroyedAfterRehearsal).toBe(true);
  expect(chapterProof.compose.runtimeNativeAot).toBe(true);
  expect(chapterProof.compose.dashboardImage).toBe('mcr.microsoft.com/aspire/dashboard:13.6.2');
  for (const id of ['dashboard-standalone', 'deployment-model', 'deployment-publish', 'deployment-deploy']) {
    for (const code of await page.locator(`#${id} pre code`).all()) {
      const text = await code.textContent();
      const copied = await code.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.toString();
      });
      expect(copied).toBe(text);
    }
  }
  await expect(page.locator('[id^="deployment"] [data-cli-replay]')).toHaveCount(2);
});
