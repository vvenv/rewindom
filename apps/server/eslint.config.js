import js from "@eslint/js";
import importPlugin from "eslint-plugin-import-x";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";

import { createImportOrderRule, strictRules } from "../../eslint.shared.js";

export default defineConfig([
  { ignores: ["dist", "node_modules", "prisma.config.ts"] },
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      ...strictRules,
      "@typescript-eslint/require-await": "off",
      "import/order": createImportOrderRule(),
    },
  },
  {
    files: ["src/modules/**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: String.raw`^(?:\.\./){2,}lib/`,
              message:
                "Server modules must not import host lib/; use an external monorepo package or module-internal paths.",
            },
            {
              regex: String.raw`^(?:\.\./){2,}kernel/`,
              message:
                "Server modules must not import host kernel/; use an external monorepo package.",
            },
            {
              regex: String.raw`^(?:\.\./){2,}generated/`,
              message:
                "Server modules must not import host generated/; use an external monorepo package.",
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
]);
