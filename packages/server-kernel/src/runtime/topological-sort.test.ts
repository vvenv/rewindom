import { type ModuleId } from "@rewindom/shared";
import { describe, expect, it } from "vitest";

import { topologicalSortModules } from "./topological-sort.js";


describe("topologicalSortModules", () => {
  it("returns modules in dependency order", () => {
    const modules = [
      { id: "c", requires: ["b"] as ModuleId[] },
      { id: "a" },
      { id: "b", requires: ["a"] as ModuleId[] },
    ];

    const sorted = topologicalSortModules(modules);
    expect(sorted.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("throws when a required module is missing", () => {
    expect(() =>
      topologicalSortModules([{ id: "x", requires: ["missing"] }]),
    ).toThrow(/missing module "missing"/);
  });

  it("throws on circular dependencies", () => {
    expect(() =>
      topologicalSortModules([
        { id: "a", requires: ["b"] },
        { id: "b", requires: ["a"] },
      ]),
    ).toThrow(/Circular module dependency/);
  });
});
