import { test, expect, type Page } from '@playwright/test';

// ─── helpers ─────────────────────────────────────────────────────────────────

async function clearSession(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.setItem('lang', 'sr');
  });
  await page.reload();
}

// ─── Auth page tests ──────────────────────────────────────────────────────────

test.describe('Auth — login form', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test('prikazuje login formu po defaultu', async ({ page }) => {
    // Tab "Prijava" postoji i aktivan je
    const loginTab = page.getByRole('button', { name: 'Prijava' });
    await expect(loginTab).toBeVisible();

    // Input za email postoji (linked via htmlFor/id)
    await expect(page.getByLabel('Email ili korisničko ime')).toBeVisible();
    await expect(page.getByLabel('Lozinka')).toBeVisible();

    // Submit dugme
    await expect(page.getByRole('button', { name: 'Prijavi se' })).toBeVisible();
  });

  test('demo dugme loguje kao guest', async ({ page }) => {
    await page.getByRole('button', { name: /Pogledaj demo/ }).click();

    // Čeka da se tabovi pojave
    await expect(page.locator('.tabs')).toBeVisible({ timeout: 8000 });

    // Header pokazuje korisničko ime "guest"
    await expect(page.locator('.header-username')).toHaveText('guest');
  });

  test('pogrešni kredencijali pokazuju grešku', async ({ page }) => {
    await page.getByLabel('Email ili korisničko ime').fill('nepostoji@test.com');
    await page.getByLabel('Lozinka').fill('pogresna123');
    await page.getByRole('button', { name: 'Prijavi se' }).click();

    // API greška se pojavljuje
    await expect(page.locator('.auth-api-error')).toBeVisible({ timeout: 5000 });
  });

  test('prazna forma pokazuje validacione greške', async ({ page }) => {
    await page.getByRole('button', { name: 'Prijavi se' }).click();

    // field-error span postoji
    const errors = page.locator('.field-error');
    await expect(errors.first()).toBeVisible();
    await expect(errors.first()).toContainText('obavezno');
  });

  test('prelaz na registraciju prikazuje nova polja', async ({ page }) => {
    await page.getByRole('button', { name: 'Registracija' }).click();

    // Korisničko ime i potvrda lozinke se pojavljuju
    await expect(page.getByLabel('Korisničko ime')).toBeVisible();
    await expect(page.getByLabel('Potvrda lozinke')).toBeVisible();

    // Submit dugme se menja
    await expect(page.getByRole('button', { name: 'Registruj se' })).toBeVisible();
  });

  test('registracija — validacija prikazuje greške na srpskom', async ({ page }) => {
    await page.getByRole('button', { name: 'Registracija' }).click();
    await page.getByRole('button', { name: 'Registruj se' }).click();

    const errors = page.locator('.field-error');
    await expect(errors.first()).toBeVisible();
    // Greška je na srpskom
    await expect(errors.first()).toContainText('obavezan');
  });
});

test.describe('Auth — logout', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await page.getByRole('button', { name: /Pogledaj demo/ }).click();
    await expect(page.locator('.tabs')).toBeVisible({ timeout: 8000 });
  });

  test('odjava vraća na login stranicu', async ({ page }) => {
    await page.getByRole('button', { name: 'Odjava' }).click();
    await expect(page.getByRole('button', { name: 'Prijava' })).toBeVisible({ timeout: 5000 });
  });
});
