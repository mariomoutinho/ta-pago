import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/personal/browser",
  workers: 1,
  timeout: 60000,
  use: {
    headless: true,
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  reporter: "list",
});
