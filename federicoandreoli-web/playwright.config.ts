import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5199',
    trace: 'on-first-retry',
  },
  webServer: {
    // Porta dedicata: evita di riusare un `vite` locale con VITE_USE_MOCKS=false.
    command: 'npm run dev -- --host 127.0.0.1 --port 5199',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      VITE_USE_MOCKS: 'true',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
