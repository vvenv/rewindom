import path from "node:path";
import { fileURLToPath } from "node:url";

import { topologicalSortModules } from "@rewindom/server-kernel/runtime/topological-sort.js";
import { describe, expect, it } from "vitest";

import { ENABLED_SERVER_MODULES } from "../src/enabled-modules.js";

import {
  assertSchemaOwnersComplete,
  collectModuleDependencyViolations,
  formatModuleDependencyViolations,
  type ModuleManifestEntry,
} from "./lib/module-dependency-rules.js";
import { SERVER_MODULE_MANIFEST } from "./lib/module-manifest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(serverRoot, "../..");

function toManifestEntry(module: (typeof ENABLED_SERVER_MODULES)[number]): ModuleManifestEntry {
  return {
    id: module.id,
    kind: module.kind,
    ...(module.requires ? { requires: [...module.requires] } : {}),
  };
}

describe("module dependency manifest", () => {
  it("static manifest matches ENABLED_SERVER_MODULES", () => {
    const runtimeManifest = ENABLED_SERVER_MODULES.map(toManifestEntry);
    expect(SERVER_MODULE_MANIFEST).toEqual(runtimeManifest);
  });

  it("requires graph is acyclic", () => {
    expect(() =>
      topologicalSortModules([...ENABLED_SERVER_MODULES]),
    ).not.toThrow();
  });

  it("requires arrays cover schema FK relations and direct code imports", () => {
    const violations = collectModuleDependencyViolations(
      serverRoot,
      monorepoRoot,
      ENABLED_SERVER_MODULES,
    );
    expect(
      violations,
      formatModuleDependencyViolations(violations) || undefined,
    ).toEqual([]);
  });

  it("every prisma/models file has a declared owning module", () => {
    expect(() => assertSchemaOwnersComplete(serverRoot)).not.toThrow();
  });
});
