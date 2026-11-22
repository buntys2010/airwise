import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3300);
/** Locally the tests use the Chrome already installed on the machine. CI installs Chromium with `npx playwright install chromium`. */
const channel = process.env.CI ? undefined : "chrome";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", channel },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    { name: "phone-390", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, channel } },
  ],
  // Needs a production build first: `npm run build`.
  webServer: { command: `npx next start -p ${PORT}`, url: `http://localhost:${PORT}`, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
