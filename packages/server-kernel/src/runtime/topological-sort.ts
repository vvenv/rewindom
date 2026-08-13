/** Topological sort for module dependency order (requires first). */

import { type ModuleId } from "@rewindom/shared";

export class ModuleDependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModuleDependencyError";
  }
}

export function topologicalSortModules<
  T extends { id: ModuleId; requires?: ModuleId[] },
>(modules: readonly T[]): T[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const visited = new Set<ModuleId>();
  const visiting = new Set<ModuleId>();
  const result: T[] = [];

  function visit(module: T): void {
    if (visited.has(module.id)) {
      return;
    }
    if (visiting.has(module.id)) {
      throw new ModuleDependencyError(`Circular module dependency: ${module.id}`);
    }

    visiting.add(module.id);

    for (const depId of module.requires ?? []) {
      const dep = byId.get(depId);
      if (!dep) {
        throw new ModuleDependencyError(
          `Module "${module.id}" requires missing module "${depId}"`,
        );
      }
      visit(dep);
    }

    visiting.delete(module.id);
    visited.add(module.id);
    result.push(module);
  }

  for (const module of modules) {
    visit(module);
  }

  return result;
}
