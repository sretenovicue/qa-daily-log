import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
    // Bypass backend rate limiter during E2E tests
    extraHTTPHeaders: { 'x-playwright-test': '1' },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Start backend + frontend before tests
  webServer: [
    {
      command: 'npm start --prefix backend',
      url: 'http://localhost:3001/api/entries?date=2099-01-01',
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      command: 'npm run dev --prefix frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 20_000,
    },
  ],
});
