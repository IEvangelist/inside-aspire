import { expect, test } from '@playwright/test';

for (const [removed, target] of [['aot', 'compiler'], ['native-proof', 'compiler'], ['commands', 'live-cli'], ['timeout', 'browser-evidence'], ['know-truth', 'ai-loops']]) {
  test(`old ${removed} links redirect to a visible slide`, async ({ page }) => {
    await page.goto(`#/${removed}`);
    await expect(page.locator('html')).toHaveAttribute('data-deck-ready', 'true');
    await expect(page).toHaveURL(new RegExp(`#/${target}(?:/\\d+)?$`));
    await expect(page.locator(`#${target} h2`)).toBeInViewport();
  });
}
