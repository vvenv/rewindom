import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";

import { createImportOrderRule, strictRules } from "../../eslint.shared.js";

export default defineConfig([
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: ["./tsconfig.app.json", "./tsconfig.node.json"],
        },
      },
    },
    rules: {
      ...strictRules,
      "import/order": createImportOrderRule([
        { pattern: "react", group: "external", position: "before" },
      ]),
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components", "@/components/*"],
              message:
                "Modules must use @rewindom/ui or @rewindom/client-shell instead of host @/components.",
            },
            {
              group: ["@/hooks", "@/hooks/*"],
              message:
                "Modules must use @rewindom/client-shell instead of host @/hooks.",
            },
            {
              group: ["@/lib/*", "!@/app-nav"],
              message:
                "Modules must use @rewindom/client-api or @rewindom/client-shell instead of host @/lib.",
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
]);
