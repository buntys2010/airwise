import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", ".next/**", "e2e/**", "mcp/dist/**"],
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "components/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}"],
      reporter: ["text-summary", "lcov"],
      // A floor, not a target: CI fails if coverage ever drops below what the suite delivers today.
      thresholds: { lines: 94, functions: 94, statements: 94, branches: 87 },
    },
  },
});
