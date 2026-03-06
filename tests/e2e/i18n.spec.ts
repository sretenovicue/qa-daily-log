import { test, expect, type Page } from '@playwright/test';

// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── i18n tests ───────────────────────────────────────────────────────────────

test.describe('i18n — auth stranica', () => {
  test('podrazumevani jezik je srpski', async ({ page }) => {
    await goToAuthFresh(page, 'sr');

    // SRB dugme ima klasu "active"
    await expect(page.getByRole('button', { name: /SRB/ })).toHaveClass(/active/);

    // Labeli su na srpskom
    await expect(page.getByRole('button', { name: 'Prijava' })).toBeVisible();
    await expect(page.getByLabel('Email ili korisničko ime')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prijavi se' })).toBeVisible();
  });

  test('klik ENG prebacuje auth stranicu na engleski', async ({ page }) => {
    await goToAuthFresh(page, 'sr');

    await page.getByRole('button', { name: /ENG/ }).click();

    // ENG dugme postaje aktivan
    await expect(page.getByRole('button', { name: /ENG/ })).toHaveClass(/active/);

    // Labeli su na engleskom
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    await expect(page.getByLabel('Email or username')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();

    // Reset
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('lang se čuva u localStorage', async ({ page }) => {
    await goToAuthFresh(page, 'sr');

    await page.getByRole('button', { name: /ENG/ }).click();
    const stored = await page.evaluate(() => localStorage.getItem('lang'));
    expect(stored).toBe('en');

    await page.getByRole('button', { name: /SRB/ }).click();
    const stored2 = await page.evaluate(() => localStorage.getItem('lang'));
    expect(stored2).toBe('sr');
  });

  test('engleski se čuva i posle reload-a', async ({ page }) => {
    await goToAuthFresh(page, 'sr');
    await page.getByRole('button', { name: /ENG/ }).click();
    await page.reload();

    // Nakon reload-a, engleski je aktivan
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();

    // Reset
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('registracija — validacione greške na srpskom', async ({ page }) => {
    await goToAuthFresh(page, 'sr');
    await page.getByRole('button', { name: 'Registracija' }).click();
    await page.getByRole('button', { name: 'Registruj se' }).click();

    const firstError = page.locator('.field-error').first();
    await expect(firstError).toContainText('obavezan');
  });

  test('registracija — validacione greške na engleskom', async ({ page }) => {
    await goToAuthFresh(page, 'sr');
    await page.getByRole('button', { name: /ENG/ }).click();
    // Klikni na Register tab (mode switch)
    await page.locator('.auth-tab').filter({ hasText: 'Register' }).click();
    // Klikni submit dugme unutar forme
    await page.locator('button[type="submit"]').click();

    const firstError = page.locator('.field-error').first();
    await expect(firstError).toContainText('required');

    // Reset
    await page.getByRole('button', { name: /SRB/ }).click();
  });
});

test.describe('i18n — glavna aplikacija', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page);
    // Osiguraj srpski
    if (await page.getByRole('button', { name: /SRB/ }).getAttribute('class').then(c => !c?.includes('active'))) {
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

    // Reset
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('logout dugme je prevedeno', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Odjava' })).toBeVisible();

    await page.getByRole('button', { name: /ENG/ }).click();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

    // Reset
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('header datum se lokalizuje po jeziku', async ({ page }) => {
    const dateLocatorSR = page.locator('.header-date').textContent();

    await page.getByRole('button', { name: /ENG/ }).click();
    const dateLocatorEN = await page.locator('.header-date').textContent();

    // en-GB format se razlikuje od sr-Latn
    expect(dateLocatorEN).not.toBe(await dateLocatorSR);

    // Reset
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('Projekti — meseci su na srpskom (Januar)', async ({ page }) => {
    await page.locator('.tabs button').filter({ hasText: /Projekti/ }).click();

    // Combobox sa mesecima sadrži srpske nazive
    // Filtriraj select koji ima opciju "Januar" (nije sort select koji ima Vreme/...)
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

    // Reset
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('Statistike — labeli stat kartica su prevedeni', async ({ page }) => {
    await page.locator('.tabs button').filter({ hasText: /Statistike/ }).click();
    // Koristimo tačan match da ne uhvatimo "Vreme danas" umesto "Danas"
    await expect(page.locator('.stat-label').filter({ hasText: /^Danas$/ })).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /ENG/ }).click();
    // Koristimo tačan regex da ne uhvatimo "Today's time" umesto "Today"
    await expect(page.locator('.stat-label').filter({ hasText: /^Today$/ })).toBeVisible();
    await expect(page.locator('.stat-label').filter({ hasText: "Today's time" })).toBeVisible();

    // Reset
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('Period — date labeli se prevode', async ({ page }) => {
    await page.locator('.tabs button').filter({ hasText: /Period/ }).click();

    // Srpski
    await expect(page.getByLabel('Od datuma')).toBeVisible();
    await expect(page.getByLabel('Do datuma')).toBeVisible();

    // Engleski
    await page.getByRole('button', { name: /ENG/ }).click();
    await expect(page.getByLabel('From date')).toBeVisible();
    await expect(page.getByLabel('To date')).toBeVisible();

    // Reset
    await page.getByRole('button', { name: /SRB/ }).click();
  });

  test('lang switcher ENG dugme postaje active', async ({ page }) => {
    await page.getByRole('button', { name: /ENG/ }).click();
    await expect(page.getByRole('button', { name: /ENG/ })).toHaveClass(/active/);
    await expect(page.getByRole('button', { name: /SRB/ })).not.toHaveClass(/active/);

    // Reset
    await page.getByRole('button', { name: /SRB/ }).click();
  });
});
