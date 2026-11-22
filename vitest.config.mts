import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: { include: ["**/*.test.{ts,tsx}"], exclude: ["**/node_modules/**", ".next/**", "e2e/**", "mcp/dist/**"], testTimeout: 30_000 },
});
