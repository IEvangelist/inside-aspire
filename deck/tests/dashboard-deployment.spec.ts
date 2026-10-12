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

test('plural loops connect real reviewed publication to current narrative and separate versioned API context', async ({ page }) => {
  await page.goto('?mode=present#/stay-current');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await expect(page.locator('#ai-loops')).toContainText('build Aspire and aspire.dev');
  await expect(page.locator('#stay-current')).toContainText('per-package-version');
  await expect(page.locator('#stay-current')).toContainText('separate from the narrative corpus');
  await expect(page.locator('#stay-current')).toContainText('not automatic CLI-semver matching');
  await expect(page.locator('#stay-current a[href*="PackageJsonGenerator"]')).toHaveAttribute('href',
    new RegExp(`${proof.versionedContext.sourcePin}/src/tools/PackageJsonGenerator/README.md$`));
  await expect(page.locator('#stay-current a[href*="astro.config"]')).toHaveAttribute('href',
    new RegExp(`${proof.versionedContext.sourcePin}/src/frontend/astro.config.mjs$`));
  await expect(page.locator('#the-loop .notes')).toContainText('skill-guided developer cycle');
  await expect(page.locator('#docs-supply .notes')).toContainText('not model weights');
  await expect(page.locator('#docs-supply .notes')).toContainText('publication without review');
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
  expect(commands[1]).toContain(proof.dashboard.image);
  for (const ports of ['127.0.0.1:18888:18888', '127.0.0.1:4317:18889', '127.0.0.1:4318:18890']) {
    expect(commands[1]).toContain(ports);
  }
  expect(commands.join('\n')).not.toMatch(/UNSECURED|ALLOW_ANONYMOUS|0\.0\.0\.0|[?&](?:t|token|api[-_]?key)=/i);
  await expect(page.locator('#dashboard-standalone')).toContainText('not recorded executions');
  await expect(page.locator('#dashboard-standalone')).toContainText('does not orchestrate your processes');
  await expect(page.locator('#dashboard-standalone')).toContainText('authentication remains enabled');
  await expect(page.locator('#dashboard-standalone')).toContainText('foreground/blocking');
  await expect(page.locator('#dashboard-integrated')).toContainText('resource service supplies state');
  await expect(page.locator('#dashboard-signals')).toContainText('Instrument code, export OTLP');
  await expect(page.locator('#dashboard-signals')).toContainText('not unlimited production retention');
  await expect(page.locator('[data-cli-replay]')).toHaveCount(7);
  await expect(page.locator('[id^="dashboard"] [data-cli-replay], [id^="dashboard"] .replay-output')).toHaveCount(0);
});

test('deployment is a full primary area with explicit Compose reference, model/publish/deploy distinction and no claimed execution', async ({ page }) => {
  await page.goto('?mode=present#/deployment');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await expect(page.locator('#deployment [data-takeaway]')).toHaveText('Aspire deployment');
  await expect(page.locator('#deployment-model .language-csharp')).toHaveText(
    'var environment = builder\n    .AddDockerComposeEnvironment("env")\n    .WithDashboard();');
  expect(proof.deployment.apiId).toContain('dockercomposeenvironmentextensions/methods#adddockercomposeenvironment');
  expect(proof.deployment.signature).toBe('AddDockerComposeEnvironment(IDistributedApplicationBuilder, string)');
  await expect(page.locator('#deployment-model')).toContainText('not a user-chosen target or the weather AppHost');
  await expect(page.locator('#deployment-model')).toContainText('No integration or graph was changed here');
  await expect(page.locator('#deployment-publish')).toContainText('does not build images or apply');
  await expect(page.locator('#deployment-publish')).toContainText('No generated output is presented as a capture');
  await expect(page.locator('#deployment-deploy')).toContainText('not an old publish folder');
  await expect(page.locator('#deployment-deploy')).toContainText('declared resources, not the AppHost process');
  await expect(page.locator('#deployment-deploy')).toContainText('No provisioning or deployment was performed');
  await expect(page.locator('#deployment-boundaries')).toContainText('Same model does not mean identical target behavior');
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
  await expect(page.locator('[id^="deployment"] [data-cli-replay], [id^="deployment"] .replay-output')).toHaveCount(0);
});
