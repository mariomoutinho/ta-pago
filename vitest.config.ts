import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/personal/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
