/**
 * Sigurnosni testovi — security.spec.ts
 *
 * Pokriva: autentikacija, autorizacija, SQL injection, brute force,
 * IDOR, payload veličina, security headers, rate limiter.
 *
 * test.step() koristi se za jasne log poruke u HTML reportu.
 * Pokretati pre svakog deploya.
 *
 * NAPOMENA: Za rate limiter testove koristimo Node.js http modul direktno
 * jer Playwright automatski dodaje x-playwright-test: 1 header koji
 * zaobilazi rate limiter (security feature za testove).
 */
import { test, expect } from '@playwright/test';
import * as http from 'http';

const API = 'http://localhost:3001';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Direktni Node.js HTTP poziv — BEZ ikakvog Playwright headera (za rate limiter testove)
function rawHttpPost(path: string, body: object): Promise<{ status: number; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options: http.RequestOptions = {
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve({
        status: res.statusCode || 0,
        headers: res.headers as Record<string, string>,
      }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function apiPost(request: any, path: string, body: object, headers?: Record<string, string>) {
  return request.post(`${API}${path}`, {
    data: body,
    headers: { 'Content-Type': 'application/json', 'x-playwright-test': '1', ...headers },
  });
}

async function apiGet(request: any, path: string, headers?: Record<string, string>) {
  return request.get(`${API}${path}`, {
    headers: { 'x-playwright-test': '1', ...headers },
  });
}

async function apiDelete(request: any, path: string, headers?: Record<string, string>) {
  return request.delete(`${API}${path}`, {
    headers: { 'x-playwright-test': '1', ...headers },
  });
}

// ─── 1. Zaštićeni endpointi — bez tokena ─────────────────────────────────────

test.describe('Sigurnost — zaštićeni endpointi (bez auth)', () => {
  test('GET /api/entries bez tokena → 401', async ({ request }) => {
    await test.step('Šalje zahtev bez Authorization headera', async () => {
      const res = await apiGet(request, '/api/entries?date=2024-01-01');
      console.log(`[sigurnost] GET /api/entries bez tokena → ${res.status()}`);
      expect(res.status()).toBe(401);
    });
  });

  test('GET /api/stats bez tokena → 401', async ({ request }) => {
    await test.step('Šalje zahtev na /api/stats bez tokena', async () => {
      const res = await apiGet(request, '/api/stats');
      console.log(`[sigurnost] GET /api/stats bez tokena → ${res.status()}`);
      expect(res.status()).toBe(401);
    });
  });

  test('GET /api/users bez tokena → 401', async ({ request }) => {
    await test.step('Šalje zahtev na /api/users bez tokena', async () => {
      const res = await apiGet(request, '/api/users');
      console.log(`[sigurnost] GET /api/users bez tokena → ${res.status()}`);
      expect(res.status()).toBe(401);
    });
  });

  test('POST /api/entries bez tokena → 401', async ({ request }) => {
    await test.step('Pokušava kreirati unos bez tokena', async () => {
      const res = await apiPost(request, '/api/entries', { category: 'bug', action: 'found', status: 'in-progress' });
      console.log(`[sigurnost] POST /api/entries bez tokena → ${res.status()}`);
      expect(res.status()).toBe(401);
    });
  });

  test('DELETE /api/entries/1 bez tokena → 401', async ({ request }) => {
    await test.step('Pokušava brisanje bez tokena', async () => {
      const res = await apiDelete(request, '/api/entries/1');
      console.log(`[sigurnost] DELETE /api/entries/1 bez tokena → ${res.status()}`);
      expect(res.status()).toBe(401);
    });
  });
});

// ─── 2. Nevažeći / pokvareni JWT ─────────────────────────────────────────────

test.describe('Sigurnost — nevažeći JWT tokeni', () => {
  test('GET /api/entries sa lažnim tokenom → 401', async ({ request }) => {
    await test.step('Šalje lažni (random string) JWT', async () => {
      const res = await apiGet(request, '/api/entries?date=2024-01-01', {
        Authorization: 'Bearer ovo.nije.validan.jwt',
      });
      console.log(`[sigurnost] Lažni JWT → ${res.status()}`);
      expect(res.status()).toBe(401);
    });
  });

  test('GET /api/entries sa isteklim JWT → 401', async ({ request }) => {
    await test.step('Šalje JWT sa exp u prošlosti (2020.)', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJ1c2VySWQiOjEsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAxMDB9.' +
        'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const res = await apiGet(request, '/api/entries?date=2024-01-01', {
        Authorization: `Bearer ${expiredToken}`,
      });
      console.log(`[sigurnost] Istekli JWT → ${res.status()}`);
      expect(res.status()).toBe(401);
    });
  });

  test('GET /api/entries sa praznim Bearer → 401', async ({ request }) => {
    await test.step('Šalje prazni Bearer token', async () => {
      const res = await apiGet(request, '/api/entries?date=2024-01-01', {
        Authorization: 'Bearer ',
      });
      console.log(`[sigurnost] Prazni Bearer → ${res.status()}`);
      expect(res.status()).toBe(401);
    });
  });
});

// ─── 3. SQL Injection ─────────────────────────────────────────────────────────

test.describe('Sigurnost — SQL injection pokušaji', () => {
  test("Login sa ' OR '1'='1' -- ne daje token", async ({ request }) => {
    await test.step('Šalje SQL injection payload u email polju', async () => {
      const res = await apiPost(request, '/api/auth/login', {
        email: "' OR '1'='1' --",
        password: 'anything',
      });
      const body = await res.json();
      console.log(`[sigurnost] SQL injection login → ${res.status()}, token: ${body.token ? 'PRISUTAN ⚠️' : 'odsutan ✅'}`);
      expect(res.status()).not.toBe(200);
      expect(body.token).toBeUndefined();
    });
  });

  test("Login sa UNION SELECT injection ne vraća token", async ({ request }) => {
    await test.step('Šalje UNION SELECT payload u email polju', async () => {
      const res = await apiPost(request, '/api/auth/login', {
        email: "' UNION SELECT 1,2,3,4,5,6,7,8,9 --",
        password: 'test',
      });
      const body = await res.json();
      console.log(`[sigurnost] UNION SELECT injection → ${res.status()}`);
      expect(res.status()).not.toBe(200);
      expect(body.token).toBeUndefined();
    });
  });

  test("Login sa DROP TABLE payload ne ruši bazu", async ({ request }) => {
    await test.step('Šalje DROP TABLE payload', async () => {
      const res = await apiPost(request, '/api/auth/login', {
        email: "admin@test.com'; DROP TABLE users; --",
        password: 'anything',
      });
      console.log(`[sigurnost] DROP TABLE injection → ${res.status()}`);
      expect(res.status()).not.toBe(200);
    });
    await test.step('Provjera da baza nije oštećena (health check)', async () => {
      const health = await apiGet(request, '/api/health');
      const body = await health.json();
      console.log(`[sigurnost] Health nakon SQL injection → ${health.status()}, ok: ${body.ok}`);
      expect(health.status()).toBe(200);
      expect(body.ok).toBe(true);
    });
  });
});

// ─── 4. Register validacija ───────────────────────────────────────────────────

test.describe('Sigurnost — register input validacija', () => {
  test('Register sa nevalidnim emailom → 400', async ({ request }) => {
    await test.step('Šalje email bez @ znaka', async () => {
      const res = await apiPost(request, '/api/auth/register', {
        email: 'nije-email',
        username: 'testuser',
        password: 'lozinka123',
      });
      const body = await res.json();
      console.log(`[sigurnost] Register nevalidan email → ${res.status()}: ${body.error}`);
      expect(res.status()).toBe(400);
      expect(body.error).toBeDefined();
    });
  });

  test('Register sa kratkom lozinkom (<8 znakova) → 400', async ({ request }) => {
    await test.step('Šalje lozinku sa 6 znakova', async () => {
      const res = await apiPost(request, '/api/auth/register', {
        email: 'test@example.com',
        username: 'testuser',
        password: 'kratka',
      });
      const body = await res.json();
      console.log(`[sigurnost] Register kratka lozinka → ${res.status()}: ${body.error}`);
      expect(res.status()).toBe(400);
      expect(body.error).toMatch(/8 znakova/);
    });
  });

  test('Register bez svih obaveznih polja → 400', async ({ request }) => {
    await test.step('Šalje prazan objekat', async () => {
      const res = await apiPost(request, '/api/auth/register', {});
      console.log(`[sigurnost] Register prazna forma → ${res.status()}`);
      expect(res.status()).toBe(400);
    });
  });
});

// ─── 5. Email verifikacija zaštita ────────────────────────────────────────────

test.describe('Sigurnost — email confirm token validacija', () => {
  test('Kratki token → greška (ne 200)', async ({ request }) => {
    await test.step('Šalje kratki string kao token', async () => {
      const res = await apiGet(request, '/api/auth/confirm/krataktoken');
      console.log(`[sigurnost] Kratki confirm token → ${res.status()}`);
      expect(res.status()).not.toBe(200);
      expect(res.status()).not.toBe(500);
    });
  });

  test('SQL injection string kao token → greška (ne 200)', async ({ request }) => {
    await test.step('Šalje SQL injection string u token putanji', async () => {
      const res = await apiGet(request, '/api/auth/confirm/UNION-SELECT-password-FROM-users--');
      console.log(`[sigurnost] SQL injection confirm token → ${res.status()}`);
      expect(res.status()).not.toBe(200);
      expect(res.status()).not.toBe(500);
    });
  });

  test('64-char hex token koji ne postoji u DB → 4xx', async ({ request }) => {
    await test.step('Šalje valjano formatiran token koji ne postoji u DB', async () => {
      const fakeToken = 'a'.repeat(64);
      const res = await apiGet(request, `/api/auth/confirm/${fakeToken}`);
      console.log(`[sigurnost] Nepostojeći valid token → ${res.status()}`);
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    });
  });
});

// ─── 6. Prekoračenje veličine payloada ───────────────────────────────────────

test.describe('Sigurnost — payload veličina (DoS zaštita)', () => {
  test('60KB payload na login → 413 ili 400', async ({ request }) => {
    await test.step('Šalje payload > 50KB limite (60KB string)', async () => {
      const bigString = 'x'.repeat(60_000);
      const res = await apiPost(request, '/api/auth/login', {
        email: bigString,
        password: bigString,
      });
      console.log(`[sigurnost] Preveliki payload → ${res.status()}`);
      expect([413, 400]).toContain(res.status());
    });
  });
});

// ─── 7. Security headers (Helmet) ────────────────────────────────────────────

test.describe('Sigurnost — HTTP security headeri (Helmet)', () => {
  test('API vraća obavezne security headere', async ({ request }) => {
    await test.step('Poziva /api/health i provjerava headere', async () => {
      const res = await apiGet(request, '/api/health');
      const headers = res.headers();
      console.log(`[sigurnost] Security headeri: X-Content-Type="${headers['x-content-type-options']}", X-Frame="${headers['x-frame-options']}", CSP="${headers['content-security-policy'] ? '✅ prisutan' : '⚠️ odsutan'}"`);
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBeDefined();
      expect(headers['content-security-policy']).toBeDefined();
    });
  });
});

// ─── 8. Rate limiter headeri ──────────────────────────────────────────────────
// Koristimo rawHttpPost — direktni Node.js HTTP koji NE sadrži x-playwright-test header

test.describe('Sigurnost — rate limiter konfiguracija', () => {
  test('Login endpoint vraća RateLimit-Limit header (direktni HTTP)', async () => {
    await test.step('Poziva login direktno preko Node.js http (bez Playwright headera)', async () => {
      const res = await rawHttpPost('/api/auth/login', {
        email: 'headercheck@test.com',
        password: 'test',
      });
      const limit = res.headers['ratelimit-limit'];
      const remaining = res.headers['ratelimit-remaining'];
      console.log(`[sigurnost] Status: ${res.status}, RateLimit-Limit: ${limit}, Remaining: ${remaining}`);
      expect(limit).toBeDefined();
      expect(Number(limit)).toBe(10); // 10 pokušaja po 15 min
    });
  });
});

// ─── 9. Brute Force simulacija — NAPAD na login ───────────────────────────────
// Koristimo rawHttpPost da bi rate limiter bio aktivan (bez x-playwright-test headera)

test.describe('Sigurnost — brute force napad simulacija', () => {
  test('Sekvencijalni napad na login blokira se posle 10 pokušaja (429)', async () => {
    const statuses: number[] = [];

    await test.step('Simulira napadača koji pogađa lozinku u petlji (direktni HTTP)', async () => {
      console.log('[brute-force] Počinjem sekvencijalni napad na login...');
      for (let i = 0; i < 20; i++) {
        const res = await rawHttpPost('/api/auth/login', {
          email: `attacker${i}@evil.com`,
          password: `wrong_password_${i}`,
        });
        statuses.push(res.status);
        console.log(`[brute-force] Pokušaj ${i + 1}: status ${res.status}`);
        if (res.status === 429) {
          console.log(`[brute-force] ✅ Rate limiter aktiviran na pokušaju ${i + 1}`);
          break;
        }
      }
    });

    await test.step('Provjera da je rate limiter aktiviran (429)', async () => {
      console.log(`[brute-force] Svi statusi: ${statuses.join(', ')}`);
      expect(
        statuses.some(s => s === 429),
        `Rate limiter NIJE aktiviran u 20 pokušaja! Statusi: ${statuses.join(', ')}`
      ).toBe(true);
    });
  });

  test('Napad na register blokira se rate limiterom', async () => {
    const statuses: number[] = [];

    await test.step('Simulira masovnu registraciju (spam napad, direktni HTTP)', async () => {
      console.log('[brute-force] Počinjem napad na register endpoint...');
      for (let i = 0; i < 20; i++) {
        const res = await rawHttpPost('/api/auth/register', {
          email: `spam${Date.now()}${i}@attacker.com`,
          username: `spamuser${i}`,
          password: 'lozinka123',
        });
        statuses.push(res.status);
        console.log(`[brute-force] Register pokušaj ${i + 1}: ${res.status}`);
        if (res.status === 429) {
          console.log(`[brute-force] ✅ Register rate limiter aktiviran na pokušaju ${i + 1}`);
          break;
        }
      }
    });

    await test.step('Provjera da je rate limiter aktiviran', async () => {
      console.log(`[brute-force] Register statusi: ${statuses.join(', ')}`);
      expect(
        statuses.some(s => s === 429),
        `Register rate limiter NIJE aktiviran! Statusi: ${statuses.join(', ')}`
      ).toBe(true);
    });
  });
});

// ─── 10. ID validacija (IDOR zaštita) ────────────────────────────────────────

test.describe('Sigurnost — IDOR i ID validacija', () => {
  test('DELETE sa string ID-jem → 401 ili 400 (auth check prvi)', async ({ request }) => {
    await test.step('Pokušaj brisanja sa abc kao ID', async () => {
      const res = await apiDelete(request, '/api/entries/abc');
      console.log(`[sigurnost] DELETE /api/entries/abc → ${res.status()}`);
      expect([400, 401]).toContain(res.status());
    });
  });

  test('DELETE sa negativnim ID-jem → 401 ili 400', async ({ request }) => {
    await test.step('Pokušaj brisanja sa -1 kao ID', async () => {
      const res = await apiDelete(request, '/api/entries/-1');
      console.log(`[sigurnost] DELETE /api/entries/-1 → ${res.status()}`);
      expect([400, 401]).toContain(res.status());
    });
  });

  test('DELETE nepostojećeg ID-ja bez tokena → 401', async ({ request }) => {
    await test.step('Auth check se dešava PRE provjere da li unos postoji', async () => {
      const res = await apiDelete(request, '/api/entries/99999999');
      console.log(`[sigurnost] DELETE /api/entries/99999999 bez tokena → ${res.status()}`);
      expect(res.status()).toBe(401);
    });
  });
});

// ─── 11. Guest korisnik — autorizacija ───────────────────────────────────────

test.describe('Sigurnost — guest autorizacija (login + napad)', () => {
  let guestToken = '';

  test.beforeAll(async ({ request }) => {
    await test.step('Login kao guest (demo mode)', async () => {
      const res = await apiPost(request, '/api/auth/login', {
        email: 'guest',
        password: 'guest',
      });
      const body = await res.json();
      guestToken = body.token || '';
      console.log(`[sigurnost] Guest login → ${res.status()}, token: ${guestToken ? '✅' : '⚠️ odsutan'}`);
    });
  });

  test('Guest NE može brisati tuđe unose', async ({ request }) => {
    await test.step('Guest pokušava DELETE na random entry ID', async () => {
      if (!guestToken) {
        console.log('[sigurnost] SKIP — guest token nije dostupan (demo login nije aktivan)');
        test.skip();
        return;
      }
      const res = await apiDelete(request, '/api/entries/1', {
        Authorization: `Bearer ${guestToken}`,
      });
      console.log(`[sigurnost] Guest DELETE tuđeg unosa → ${res.status()}`);
      // Mora biti 403 (Forbidden) ili 404 (ne postoji za ovog usera) — ne 200
      expect(res.status()).not.toBe(200);
    });
  });

  test('Guest NE može pristupiti /api/users (manager-only)', async ({ request }) => {
    await test.step('Guest pokušava GET /api/users', async () => {
      if (!guestToken) {
        console.log('[sigurnost] SKIP — guest token nije dostupan');
        test.skip();
        return;
      }
      const res = await apiGet(request, '/api/users', {
        Authorization: `Bearer ${guestToken}`,
      });
      console.log(`[sigurnost] Guest GET /api/users → ${res.status()}`);
      expect(res.status()).not.toBe(200);
    });
  });
});
