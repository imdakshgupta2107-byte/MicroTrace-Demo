import { defineConfig, devices } from "@playwright/test";

const dev = process.env.E2E_DEV === "1";
const port = dev ? 5302 : 5301;
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    timezoneId: "Asia/Kolkata",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      args: ["--no-sandbox"],
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
    },
  },
  projects: [
    { name: "Desktop Chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "Android-sized Chromium", use: { ...devices["Pixel 5"] } },
    { name: "Tablet Chromium", use: { viewport: { width: 834, height: 1112 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
    { name: "Small phone Chromium", use: { viewport: { width: 320, height: 780 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: dev ? `npm run dev -- --host 0.0.0.0 --port ${port} --strictPort` : `npm run preview -- --host 0.0.0.0 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
