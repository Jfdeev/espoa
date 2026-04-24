import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    env: {
      JWT_SECRET: "test-secret-for-vitest",
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/app.ts", "src/**/*.test.ts"],
      reporter: ["text", "lcov"],
    },
  },
});
