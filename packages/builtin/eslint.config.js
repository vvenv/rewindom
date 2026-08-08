/**
 * 模块包的 lint 配置。
 *
 * 除全仓通用严格规则外，额外启用 **import-x/no-cycle**：模块曾各自是 workspace 包，
 * 包间环由 `scripts/check-circular-deps.mjs` 守护；收敛为单包后那个棘轮对模块失效，
 * 环退化为包**内**的文件级依赖，只能靠这里守。
 */
import js from "@eslint/js";
import importPlugin from "eslint-plugin-import-x";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";

import { createImportOrderRule, strictRules } from "../../eslint.shared.js";
import { tenantScopePlugin } from "../../eslint-rules/tenant-scope.js";

export default defineConfig([
  { ignores: ["node_modules", "**/dist/**"] },
  { linterOptions: { reportUnusedDisableDirectives: false } },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { import: importPlugin },
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: { ...strictRules, "import/order": createImportOrderRule([{ pattern: "react", group: "external", position: "before" }]) },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { "import-x": importPlugin },
    settings: {
      "import-x/resolver": { typescript: { project: "./tsconfig.json" } },
    },
    rules: {
      "import-x/no-cycle": [
        "error",
        { maxDepth: Infinity, ignoreExternal: true },
      ],
      "import-x/no-self-import": "error",
    },
  },
  {
    // 租户隔离的提前反馈层，与运行时 tenant-guard 配套。
    files: ["**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.test-mocks.ts", "**/*.test-shared.ts"],
    plugins: { "tenant-scope": tenantScopePlugin },
    rules: { "tenant-scope/require-tenant-scope": "warn" },
  },
  {
    // 平台模块就是跨租户控制台本身：它的服务按设计要看全量数据，
    // 运行时守卫也因平台请求无 tenant_id 而放行。在这里报警只会是噪音。
    files: ["platform/server/**/*.ts"],
    rules: { "tenant-scope/require-tenant-scope": "off" },
  },
  {
    // 测试文件：`vi.mock` / `vi.hoisted` 需夹在 import 之间（vitest 的提升语义），
    // 与 import/order 直接冲突；`import()` 类型注解也是 mock 工厂的惯用写法。
    // 生产代码不放宽。
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.test-mocks.ts", "**/*.test-shared.ts"],
    rules: {
      "import/order": "off",
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
  eslintConfigPrettier,
]);
