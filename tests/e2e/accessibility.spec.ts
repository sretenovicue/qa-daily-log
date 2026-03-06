import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function loginAsGuest(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.setItem('lang', 'sr');
  });
  await page.reload();
  await page.getByRole('button', { name: /Pogledaj demo/ }).click();
  await expect(page.locator('.tabs')).toBeVisible({ timeout: 8000 });
}

test.describe('Accessibility (axe)', () => {
  test('auth stranica — nema kriticnih a11y grešaka', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.setItem('lang', 'sr');
    });
    await page.reload();

    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])  // dark theme — subjektivno
      .analyze();

    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical, `Kritične a11y greške:\n${critical.map(v => `${v.id}: ${v.description}`).join('\n')}`).toHaveLength(0);
  });

  test('glavna app stranica — nema kriticnih a11y grešaka', async ({ page }) => {
    await loginAsGuest(page);

    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();

    const critical = results.violations.filter(v => v.impact === 'critical');
    expect(critical, `Kritične a11y greške:\n${critical.map(v => `${v.id}: ${v.description}`).join('\n')}`).toHaveLength(0);
  });

  test('Period tab — a11y', async ({ page }) => {
    await loginAsGuest(page);
    await page.locator('.tabs button').filter({ hasText: /Period/ }).click();

    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();

    const serious = results.violations.filter(v => ['critical', 'serious'].includes(v.impact ?? ''));
    expect(serious, serious.map(v => `${v.id}: ${v.description}`).join('\n')).toHaveLength(0);
  });

  test('Statistike tab — a11y', async ({ page }) => {
    await loginAsGuest(page);
    await page.locator('.tabs button').filter({ hasText: /Statistike/ }).click();
    // Sačekaj da stats-grid postane vidljiv — koristimo last() jer su oba taba mountovana
    await expect(page.locator('.stats-grid').last()).toBeVisible({ timeout: 20000 });

    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();

    const serious = results.violations.filter(v => ['critical', 'serious'].includes(v.impact ?? ''));
    expect(serious, serious.map(v => `${v.id}: ${v.description}`).join('\n')).toHaveLength(0);
  });
});
