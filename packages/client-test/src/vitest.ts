import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import {
  createModuleServerTestProject,
  createModuleSharedTestProject,
} from "@rewindom/server-test/vitest";
import { defineConfig, defineProject, type UserConfig } from "vitest/config";

const PACKAGE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SETUP = path.join(PACKAGE_ROOT, "setup.ts");
const MODULE_I18N_SETUP = path.join(PACKAGE_ROOT, "module-i18n-setup.ts");

export interface ClientVitestOptions {
  /** Directory containing vitest.config.ts */
  root: string;
  setupFiles?: string[];
  include?: string[];
  exclude?: string[];
  alias?: Record<string, string>;
  /** Absolute path to module `client/i18n.ts`; registers bundles in setup. */
  moduleI18nPath?: string;
  coverage?: NonNullable<UserConfig["test"]>["coverage"];
}

const DEFAULT_COVERAGE = {
  provider: "v8" as const,
  reporter: ["text", "json", "html", "lcov"] as const,
  exclude: [
    "node_modules/",
    "dist/",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "**/types.ts",
    "**/*.d.ts",
    "src/components/ui/",
    "src/pages/",
    "src/test/",
  ],
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 60,
    statements: 60,
  },
};

function buildClientTestConfig(options: ClientVitestOptions) {
  const {
    root,
    setupFiles = [],
    include = ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude = ["dist/**", "node_modules/**"],
    alias = {},
    moduleI18nPath,
  } = options;

  const resolvedSetupFiles = [
    DEFAULT_SETUP,
    ...(moduleI18nPath ? [MODULE_I18N_SETUP] : []),
    ...setupFiles,
  ];

  return {
    plugins: [react()],
    root,
    test: {
      globals: true,
      environment: "happy-dom" as const,
      setupFiles: resolvedSetupFiles,
      include,
      exclude,
      coverage: options.coverage ?? DEFAULT_COVERAGE,
      ...(moduleI18nPath
        ? { env: { REWINDOM_CLIENT_I18N: moduleI18nPath } }
        : {}),
    },
    resolve: {
      alias,
      /*
       * i18next / react-i18next 必须**全局只有一份实例**。
       *
       * 文案是在 setup 文件里注册的（`module-i18n-setup.ts`，它从 client-test 自己的
       * node_modules 解析 i18next），而被测组件的 `useTranslation` 是从模块自己的
       * 依赖树解析的——pnpm 的隔离式 node_modules 下这是**两个** i18next 实例：
       * 一个装着全部文案却没人用，另一个被组件用着却一条文案都没有，于是 `t()`
       * 原样吐回 key，断言按中文文案找元素就找不到。
       */
      dedupe: ["i18next", "react-i18next", "react", "react-dom"],
    },
  };
}

export function defineClientVitestConfig(options: ClientVitestOptions) {
  return defineConfig(buildClientTestConfig(options));
}

export function createClientTestProject(options: ClientVitestOptions) {
  return defineProject(buildClientTestConfig(options));
}

export function createModuleClientTestProject(moduleRoot: string) {
  const clientRoot = path.join(moduleRoot, "client");
  const moduleI18nPath = path.join(clientRoot, "i18n.ts");
  return createClientTestProject({
    root: clientRoot,
    include: ["**/*.{test,spec}.{ts,tsx}"],
    moduleI18nPath: existsSync(moduleI18nPath) ? moduleI18nPath : undefined,
  });
}

/** Vitest multi-project config for a single module dir (`packages/builtin/<id>/`). */
export function defineModuleVitestConfig(moduleRoot: string) {
  return defineConfig({
    test: {
      projects: [
        createModuleServerTestProject(moduleRoot),
        createModuleClientTestProject(moduleRoot),
        createModuleSharedTestProject(moduleRoot),
      ],
    },
  });
}
