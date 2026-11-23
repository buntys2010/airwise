import js from "@eslint/js";
import next from "@next/eslint-plugin-next";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "mcp/node_modules/**",
      "mcp/dist/**",
      "mcp/server.ts",
      "mcp/smoke.mjs",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  sonarjs.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "react-hooks": reactHooks, "@next/next": next },
    rules: {
      ...next.configs["core-web-vitals"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports", disallowTypeAnnotations: false },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
      "prefer-const": "error",
      "no-var": "error",
      // Keep functions small enough to read in one screen. These are errors so CI holds the line.
      complexity: ["error", 15],
      "sonarjs/cognitive-complexity": ["error", 15],
      // Our results are intentional discriminated unions (a value or a reason); callers narrow them.
      "sonarjs/function-return-type": "off",
      "max-depth": ["error", 4],
      "max-params": ["error", 5],
      "max-lines-per-function": ["error", { max: 150, skipBlankLines: true, skipComments: true }],
      "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["scripts/**", "*.config.{mjs,mts,ts}"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Tests and build scripts may be long and may print.
    files: ["**/*.test.{ts,tsx}", "e2e/**", "scripts/**", "evals/**"],
    rules: {
      "no-console": "off",
      complexity: "off",
      "max-depth": "off",
      "max-lines-per-function": "off",
      "max-lines": "off",
      "sonarjs/cognitive-complexity": "off",
      "sonarjs/no-duplicate-string": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "sonarjs/no-hardcoded-ip": "off",
      "sonarjs/no-clear-text-protocols": "off",
      "sonarjs/no-alphabetical-sort": "off",
      "sonarjs/prefer-specific-assertions": "off",
      "sonarjs/no-nested-template-literals": "off",
      "sonarjs/concise-regex": "off",
      "sonarjs/prefer-regexp-exec": "off",
      "sonarjs/public-static-readonly": "off",
      "sonarjs/no-undefined-argument": "off",
      "sonarjs/no-skipped-tests": "off",
      "sonarjs/prefer-read-only-props": "off",
    },
  },
  {
    // One import order everywhere: packages first, then the project's own modules, then relative paths.
    files: ["**/*.{ts,tsx,mjs}"],
    plugins: { "simple-import-sort": simpleImportSort },
    rules: { "simple-import-sort/imports": "error", "simple-import-sort/exports": "error" },
  },
  {
    // Plain JS/config files are not part of the TypeScript project.
    files: ["**/*.{mjs,js}", "*.config.*"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Translation tables are data, not logic: they grow with every string.
    files: ["lib/i18n.ts"],
    rules: { "max-lines": "off" },
  },
  prettier,
  {
    // Last on purpose: eslint-config-prettier switches max-len off. Long lines hide code: wrap
    // comments. URLs, strings, templates and regexes are exempt because Prettier cannot wrap them.
    files: ["**/*.{ts,tsx,mjs}"],
    rules: {
      "max-len": [
        "error",
        {
          code: 110,
          comments: 110,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
    },
  },
);
