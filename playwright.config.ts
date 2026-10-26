import { defineConfig, devices } from "@playwright/test";

if (process.env.E2E_BASE_URL !== "http://localhost:3100")
  throw new Error("Run browser flows through pnpm e2e against the guarded local server");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: true,
  maxFailures: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    channel: "chrome",
    baseURL: process.env.E2E_BASE_URL,
    trace: "off",
    screenshot: "off",
  },
});
