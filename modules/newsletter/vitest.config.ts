import { existsSync } from "node:fs";
import path from "node:path";
import { createModuleClientTestProject } from "@rewindom/client-test/vitest";
import {
  createModuleServerTestProject,
  createModuleSharedTestProject,
} from "@rewindom/server-test/vitest";
import { defineConfig } from "vitest/config";

const ROOT = import.meta.dirname;

function named<T extends { test?: Record<string, unknown> }>(
  project: T,
  name: string,
): T {
  return { ...project, test: { ...(project.test ?? {}), name } };
}

export default defineConfig({
  test: {
    projects: [
      ...(existsSync(path.join(ROOT, "server"))
        ? [named(createModuleServerTestProject(ROOT), "server")]
        : []),
      ...(existsSync(path.join(ROOT, "client"))
        ? [named(createModuleClientTestProject(ROOT), "client")]
        : []),
      ...(existsSync(path.join(ROOT, "shared"))
        ? [named(createModuleSharedTestProject(ROOT), "shared")]
        : []),
    ],
  },
});
