import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import {
  createModuleServerTestProject,
  createModuleSharedTestProject,
} from "@be-water/server-test/vitest";
import { defineConfig, defineProject, type UserConfig } from "vitest/config";

const PACKAGE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SETUP = path.join(PACKAGE_ROOT, "setup.ts");

export interface ClientVitestOptions {
  /** Directory containing vitest.config.ts */
  root: string;
  setupFiles?: string[];
  include?: string[];
  exclude?: string[];
  alias?: Record<string, string>;
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
  } = options;

  return {
    plugins: [react()],
    root,
    test: {
      globals: true,
      environment: "happy-dom" as const,
      setupFiles: [DEFAULT_SETUP, ...setupFiles],
      include,
      exclude,
      coverage: options.coverage ?? DEFAULT_COVERAGE,
    },
    resolve: {
      alias,
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
  return createClientTestProject({
    root: path.join(moduleRoot, "client"),
    include: ["**/*.{test,spec}.{ts,tsx}"],
  });
}

/** Vitest multi-project config for a single module dir (`packages/modules/<id>/`). */
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
