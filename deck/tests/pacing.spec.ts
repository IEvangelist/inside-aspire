import { expect, test } from '@playwright/test';

test('audience deck leaves build/proof/operations to real editor and terminal demos', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
  await expect(page.locator('section[id]')).toHaveCount(41);
  await expect(page.locator('#aot, #native-proof, #commands')).toHaveCount(0);
  const headings = await page.locator('section h2').allTextContents();
  expect(headings).not.toContain('Compile the API. Generate its shapes.');
  expect(headings).not.toContain('Prove the native runtime.');
  expect(headings).not.toContain('Find the target. Wait. Inspect.');
  await expect(page.locator('#weather .notes')).toContainText('VS Code');
  await expect(page.locator('#weather .notes')).toContainText('demo/Weather.Api/Program.cs');
  await expect(page.locator('#lifecycle #apphost-code')).toBeAttached();
  await expect(page.locator('#parser #parser-code')).toBeAttached();
  await expect(page.locator('#live-cli pre > code')).toHaveCount(2);
  await expect(page.locator('#live-cli')).not.toContainText('runtimeIdentifier');
});

for (const [removed, target] of [['aot', 'compiler'], ['native-proof', 'compiler'], ['commands', 'live-cli'], ['timeout', 'browser-evidence'], ['know-truth', 'ai-loops']]) {
  test(`old ${removed} links resolve to the lean ${target} handoff`, async ({ page }) => {
    await page.goto(`#/${removed}`);
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(page).toHaveURL(new RegExp(`#/${target}(?:/\\d+)?$`));
    await expect(page.locator(`#${target} h2`)).toBeInViewport();
  });
}
