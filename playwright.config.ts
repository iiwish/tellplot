import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env['TELLPLOT_E2E_PORT'] ?? '4174';
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;
const e2eWorkers = Number.parseInt(process.env['TELLPLOT_E2E_WORKERS'] ?? '2', 10);
const performanceSpec = /performance\.spec\.ts/;
const retryDiagnostics = process.env['CI'] ? 'on-first-retry' : 'off';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  workers: e2eWorkers,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: e2eBaseUrl,
    screenshot: 'only-on-failure',
    // Avoid recording every passing browser context; CI retries still retain actionable diagnostics.
    trace: retryDiagnostics,
    video: retryDiagnostics,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: performanceSpec,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-performance',
      retries: 0,
      testMatch: performanceSpec,
      // Recording adds observer overhead to the latency samples; the test attaches its own metrics.
      use: {
        ...devices['Desktop Chrome'],
        screenshot: 'off',
        trace: 'off',
        video: 'off',
      },
    },
    {
      name: 'firefox',
      testIgnore: performanceSpec,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: performanceSpec,
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm --filter @tellplot/playground exec vite preview --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    url: e2eBaseUrl,
    reuseExistingServer: false,
    // Keep multi-package startup bounded without changing any test or performance assertion timeout.
    timeout: 180_000,
  },
});
