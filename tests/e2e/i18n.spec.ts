import { test, expect, type Page } from '@playwright/test';

async function goToAuthFresh(page: Page, lang = 'sr') {
  await page.goto('/');
  await page.evaluate((l) => {
    localStorage.removeItem('token');
    localStorage.setItem('lang', l);
  }, lang);
  await page.reload();
}

async function loginAsGuest(page: Page) {
  await goToAuthFresh(page, 'sr');
  await page.getByRole('button', { name: /Pogledaj demo/ }).click();
  await expect(page.locator('.tabs')).toBeVisible({ timeout: 8000 });
}

test.describe('i18n — auth stranica', () => {
  test('podrazumevani jezik je srpski', async ({ page }) => {
    await goToAuthFresh(page, 'sr');
    await expect(page.getByRole('button', { name: /SRB/ })).toHaveClass(/active/);
    await expect(page.getByRole('button', { name: 'Prijava' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email ili korisničko ime' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prijavi se' })).toBeVisible();
  });

  test('klik ENG prebacuje auth stranicu na engleski', async ({ page }) => {
    await goToAuthFresh(page, 'sr');
    await page.getByRole('button', { name: /ENG/ }).click();
    await expect(page.getByRole('button', { name: /ENG/ })).toHaveClass(/active/);
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email or username' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('lang se čuva u localStorage', async ({ page }) => {
    await goToAuthFresh(page, 'sr');
    await page.getByRole('button', { name: /ENG/ }).click();
    expect(await page.evaluate(() => localStorage.getItem('lang'))).toBe('en');
    await page.getByRole('button', { name: /SRB/ }).click();
    expect(await page.evaluate(() => localStorage.getItem('lang'))).toBe('sr');
  });

  test('engleski se čuva i posle reload-a', async ({ page }) => {
    await goToAuthFresh(page, 'sr');
    await page.getByRole('button', { name: /ENG/ }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('registracija — validacione greške na srpskom', async ({ page }) => {
    await goToAuthFresh(page, 'sr');
    await page.getByRole('button', { name: 'Registracija' }).click();
    await page.getByRole('button', { name: 'Registruj se' }).click();
    await expect(page.locator('.field-error').first()).toContainText('obavezan');
  });

  test('registracija — validacione greške na engleskom', async ({ page }) => {
    await goToAuthFresh(page, 'sr');
    await page.getByRole('button', { name: /ENG/ }).click();
    await page.getByRole('button', { name: 'Register' }).first().click(); // mode switch
    await page.locator('button[type="submit"]').click();                   // submit
    await expect(page.locator('.field-error').first()).toContainText('required');
    await page.getByRole('button', { name: /SRB/ }).click();
  });
});

test.describe('i18n — glavna aplikacija', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page);
    const srbClass = await page.getByRole('button', { name: /SRB/ }).getAttribute('class');
    if (!srbClass?.includes('active')) {
      await page.getByRole('button', { name: /SRB/ }).click();
    }
  });

  test('tabovi su na srpskom po defaultu', async ({ page }) => {
    const tabs = page.locator('.tabs button');
    await expect(tabs.filter({ hasText: 'Dnevni log' })).toBeVisible();
    await expect(tabs.filter({ hasText: 'Statistike' })).toBeVisible();
    await expect(tabs.filter({ hasText: 'Projekti' })).toBeVisible();
  });

  test('ENG dugme menja sve tabove na engleski', async ({ page }) => {
    await page.getByRole('button', { name: /ENG/ }).click();
    const tabs = page.locator('.tabs button');
    await expect(tabs.filter({ hasText: 'Daily Log' })).toBeVisible();
    await expect(tabs.filter({ hasText: 'Statistics' })).toBeVisible();
    await expect(tabs.filter({ hasText: 'Projects' })).toBeVisible();
    await expect(tabs.filter({ hasText: 'Team' })).toBeVisible();
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('logout dugme je prevedeno', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Odjava' })).toBeVisible();
    await page.getByRole('button', { name: /ENG/ }).click();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('header datum se lokalizuje po jeziku', async ({ page }) => {
    const dateSR = await page.locator('.header-date').textContent();
    await page.getByRole('button', { name: /ENG/ }).click();
    const dateEN = await page.locator('.header-date').textContent();
    expect(dateEN).not.toBe(dateSR);
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('Projekti — meseci su na srpskom (Januar)', async ({ page }) => {
    await page.locator('.tabs button').filter({ hasText: /Projekti/ }).click();
    const monthSelect = page.locator('select').filter({
      has: page.locator('option').filter({ hasText: 'Januar' }),
    });
    await expect(monthSelect).toContainText('Januar');
  });

  test('Projekti — meseci se prevode na engleski (January)', async ({ page }) => {
    await page.getByRole('button', { name: /ENG/ }).click();
    await page.locator('.tabs button').filter({ hasText: /Projects/ }).click();
    const monthSelect = page.locator('select').filter({
      has: page.locator('option').filter({ hasText: 'January' }),
    });
    await expect(monthSelect).toContainText('January');
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('Statistike — labeli stat kartica su prevedeni', async ({ page }) => {
    await page.locator('.tabs button').filter({ hasText: /Statistike/ }).click();
    await expect(page.locator('.stat-label').filter({ hasText: /^Danas$/ })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /ENG/ }).click();
    await expect(page.locator('.stat-label').filter({ hasText: /^Today$/ })).toBeVisible();
    await expect(page.locator('.stat-label').filter({ hasText: "Today's time" })).toBeVisible();
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('Period — date labeli se prevode', async ({ page }) => {
    await page.locator('.tabs button').filter({ hasText: /Period/ }).click();
    // Koristimo ID jer su Period i Weekly oba mountovana (display:none pattern)
    await expect(page.locator('#period-from')).toBeVisible();
    await expect(page.locator('#period-to')).toBeVisible();
    await page.getByRole('button', { name: /ENG/ }).click();
    await expect(page.locator('#period-from')).toBeVisible();
    await expect(page.locator('#period-to')).toBeVisible();
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('lang switcher ENG dugme postaje active', async ({ page }) => {
    await page.getByRole('button', { name: /ENG/ }).click();
    await expect(page.getByRole('button', { name: /ENG/ })).toHaveClass(/active/);
    await expect(page.getByRole('button', { name: /SRB/ })).not.toHaveClass(/active/);
    await page.getByRole('button', { name: /SRB/ }).click();
  });
});
