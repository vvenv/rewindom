import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, defineProject, type UserConfig } from "vitest/config";

const PACKAGE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SETUP = path.join(PACKAGE_ROOT, "vitest-setup.ts");

export interface ServerVitestOptions {
  /** Directory containing vitest.config.ts */
  root: string;
  /** Extra setup files after the default prisma mock setup */
  setupFiles?: string[];
  include?: string[];
  exclude?: string[];
  coverage?: NonNullable<UserConfig["test"]>["coverage"];
}

const DEFAULT_COVERAGE = {
  provider: "v8" as const,
  reporter: ["text", "json", "html", "lcov"] as const,
  exclude: [
    "node_modules/",
    "dist/",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/types/",
    "**/generated/",
  ],
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 60,
    statements: 60,
  },
};

function buildServerTestConfig(options: ServerVitestOptions) {
  const {
    root,
    setupFiles = [],
    include = ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    exclude = ["dist/**", "node_modules/**"],
  } = options;

  return {
    root,
    test: {
      globals: true,
      environment: "node" as const,
      setupFiles: [DEFAULT_SETUP, ...setupFiles],
      include,
      exclude,
      testTimeout: 10_000,
      hookTimeout: 30_000,
      coverage: options.coverage ?? DEFAULT_COVERAGE,
    },
  };
}

export function defineServerVitestConfig(options: ServerVitestOptions) {
  return defineConfig(buildServerTestConfig(options));
}

export function createServerTestProject(options: ServerVitestOptions) {
  return defineProject(buildServerTestConfig(options));
}

export interface NodeVitestOptions {
  root: string;
  include?: string[];
  exclude?: string[];
  coverage?: NonNullable<UserConfig["test"]>["coverage"];
}

function buildNodeTestConfig(options: NodeVitestOptions) {
  const {
    root,
    include = ["src/**/*.test.ts"],
    exclude = ["dist/**", "node_modules/**"],
  } = options;

  return {
    root,
    test: {
      globals: true,
      environment: "node" as const,
      include,
      exclude,
      coverage: options.coverage ?? {
        ...DEFAULT_COVERAGE,
        reportsDirectory: "./coverage",
      },
    },
  };
}

/** Node-only tests without prisma/auth setup (shared pure logic). */
export function defineNodeVitestConfig(options: NodeVitestOptions) {
  return defineConfig(buildNodeTestConfig(options));
}

export function createNodeTestProject(options: NodeVitestOptions) {
  return defineProject(buildNodeTestConfig(options));
}

export function createModuleServerTestProject(
  moduleRoot: string,
  options?: Pick<ServerVitestOptions, "setupFiles">,
) {
  return createServerTestProject({
    root: path.join(moduleRoot, "server"),
    setupFiles: options?.setupFiles,
    include: ["**/*.test.ts"],
  });
}

export function createModuleSharedTestProject(moduleRoot: string) {
  return createNodeTestProject({
    root: path.join(moduleRoot, "shared"),
    include: ["**/*.test.ts"],
  });
}
