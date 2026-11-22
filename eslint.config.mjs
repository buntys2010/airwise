import js from "@eslint/js";
import next from "@next/eslint-plugin-next";
import globals from "globals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "mcp/**", "coverage/**", "test-results/**", "playwright-report/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "@next/next": next },
    rules: {
      ...next.configs["core-web-vitals"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports", disallowTypeAnnotations: false }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
      "prefer-const": "error",
      "no-var": "error",
      // Keep functions small enough to read in one screen. These are errors so CI holds the line.
      complexity: ["error", 15],
      "max-depth": ["error", 4],
      "max-params": ["error", 5],
    },
  },
  { files: ["scripts/**", "*.config.{mjs,mts,ts}"], languageOptions: { globals: { ...globals.node } } },
  {
    // Tests and build scripts may be long and may print.
    files: ["**/*.test.{ts,tsx}", "e2e/**", "scripts/**", "evals/**"],
    rules: { "no-console": "off", complexity: "off", "max-depth": "off" },
  },
);
