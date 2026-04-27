/* global process */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './qa/tests',
  testMatch: '**/*.spec.js',
  
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  
  reporter: [
    ['html', { outputFolder: 'qa/test-results' }],
    ['json', { outputFile: 'qa/test-results/results.json' }],
    ['list']
  ],

  use: {
    baseURL: process.env.TEST_APP_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});