import path from "node:path";

import { describe, expect, it } from "vitest";

import { findMonorepoRoot } from "./monorepo-root.js";

describe("findMonorepoRoot", () => {
  it("finds the repo root from the current working directory", () => {
    const root = findMonorepoRoot(import.meta.url, process.cwd());
    expect(path.basename(root)).toBe("be-water");
    expect(root.endsWith(`${path.sep}packages`)).toBe(false);
  });
});
