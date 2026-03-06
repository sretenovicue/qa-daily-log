import { test, expect, type Page } from '@playwright/test';

// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── Navigation tests ─────────────────────────────────────────────────────────

test.describe('Navigacija tabovima', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page);
  });

  test('svi tabovi su vidljivi', async ({ page }) => {
    const tabs = page.locator('.tabs button');
    // Manager tabs su vidljivi i za guest role
    await expect(tabs.filter({ hasText: /Dnevni log/ })).toBeVisible();
    await expect(tabs.filter({ hasText: /Period/ })).toBeVisible();
    await expect(tabs.filter({ hasText: /Projekti/ })).toBeVisible();
    await expect(tabs.filter({ hasText: /Statistike/ })).toBeVisible();
    await expect(tabs.filter({ hasText: /Tim/ })).toBeVisible();
    await expect(tabs.filter({ hasText: /Korisnici/ })).toBeVisible();
  });

  test('Dnevni log tab je aktivan po defaultu', async ({ page }) => {
    const logTab = page.locator('.tabs button').filter({ hasText: /Dnevni log/ });
    await expect(logTab).toHaveClass(/active/);
    // Navigacioni prev/next gumbi su vidljivi
    await expect(page.getByRole('button', { name: '← Prethodni' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sledeći →' })).toBeVisible();
    await expect(page.locator('.date-label')).toBeVisible();
  });

  test('klik na Period tab prikazuje period view', async ({ page }) => {
    await page.locator('.tabs button').filter({ hasText: /Period/ }).click();

    // Koristimo ID jer su Period i Weekly oba mountovana (display:none pattern)
    await expect(page.locator('#period-from')).toBeVisible();
    await expect(page.locator('#period-to')).toBeVisible();

    await expect(page.getByRole('button', { name: /7 dana/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /30 dana/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ovaj mesec/ })).toBeVisible();
  });

  test('klik na Projekti tab prikazuje projects view', async ({ page }) => {
    await page.locator('.tabs button').filter({ hasText: /Projekti/ }).click();

    // Selector za mesec postoji
    await expect(page.locator('.sort-bar label').filter({ hasText: 'Mesec:' })).toBeVisible();

    // Tabela sa kolonom "Projekat" — koristimo last() jer DailyLog (skriven) ima isti th u DOM-u
    await expect(page.locator('th').filter({ hasText: 'Projekat' }).last()).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Ukupno' }).last()).toBeVisible();
  });

  test('klik na Statistike tab prikazuje stat kartice', async ({ page }) => {
    await page.locator('.tabs button').filter({ hasText: /Statistike/ }).click();

    // Stat kartice sa labelima — koristimo tačan regex da ne uhvatimo "Vreme danas"
    await expect(page.locator('.stat-label').filter({ hasText: /^Danas$/ })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.stat-label').filter({ hasText: 'Ukupno unosa' })).toBeVisible();
  });

  test('datum navigacija — klik na Prethodni menja datum', async ({ page }) => {
    const initialLabel = await page.locator('.date-label').textContent();
    await page.getByRole('button', { name: '← Prethodni' }).click();
    // Datum se promenio
    await expect(page.locator('.date-label')).not.toHaveText(initialLabel!);
  });

  test('datum navigacija — klik na Sledeći vraća danas', async ({ page }) => {
    const todayLabel = await page.locator('.date-label').textContent();
    await page.getByRole('button', { name: '← Prethodni' }).click();
    await page.getByRole('button', { name: 'Sledeći →' }).click();
    await expect(page.locator('.date-label')).toHaveText(todayLabel!);
  });

  test('Period — shortcut dugme Posednjih 7 dana menja datume', async ({ page }) => {
    await page.locator('.tabs button').filter({ hasText: /Period/ }).click();

    // Koristimo ID jer su Period i Weekly oba mountovana (display:none pattern)
    const fromBefore = await page.locator('#period-from').inputValue();
    await page.getByRole('button', { name: /7 dana/ }).click();
    const fromAfter = await page.locator('#period-from').inputValue();

    expect(fromAfter).not.toBe(fromBefore);
  });
});
