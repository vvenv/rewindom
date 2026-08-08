import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { createModuleClientTestProject } from "@be-water/client-test/vitest";
import {
  createModuleServerTestProject,
  createModuleSharedTestProject,
} from "@be-water/server-test/vitest";
import { defineConfig } from "vitest/config";

const ROOT = import.meta.dirname;

/** 模块目录：本包下除 node_modules 外的一级目录（业务模块 be-water 在 @be-water/be-water）。 */
const MODULE_IDS = readdirSync(ROOT, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      entry.name !== "node_modules",
  )
  .map((entry) => entry.name)
  .sort();

/** 给 project 命名，否则 30 个 project 在报告里只显示序号。 */
function named<T extends { test?: Record<string, unknown> }>(
  project: T,
  name: string,
): T {
  return { ...project, test: { ...(project.test ?? {}), name } };
}

export default defineConfig({
  test: {
    projects: MODULE_IDS.flatMap((id) => {
      const root = path.join(ROOT, id);
      const projects = [];
      if (existsSync(path.join(root, "server"))) {
        projects.push(named(createModuleServerTestProject(root), `${id}/server`));
      }
      if (existsSync(path.join(root, "client"))) {
        projects.push(named(createModuleClientTestProject(root), `${id}/client`));
      }
      if (existsSync(path.join(root, "shared"))) {
        projects.push(named(createModuleSharedTestProject(root), `${id}/shared`));
      }
      return projects;
    }),
  },
});
