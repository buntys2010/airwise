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
      include: ["lib/**", "components/**", "app/**"],
      exclude: ["**/*.test.{ts,tsx}", "app/test-city.ts"],
      reporter: ["text-summary", "json-summary"],
      // Floors set just under today's numbers so coverage can rise but not quietly fall.
      thresholds: { lines: 85, statements: 85, functions: 83, branches: 78 },
    },
  },
});
