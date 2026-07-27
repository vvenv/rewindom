import { describe, expect, it, vi } from "vitest";

import { ModuleLoader } from "./module-loader.js";

import type { ServerAppModule } from "./module-contract.js";
import type { FastifyInstance } from "fastify";

function createMockApp(): FastifyInstance {
  const log = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return { log } as unknown as FastifyInstance;
}

describe("ModuleLoader", () => {
  it("registers providers, routes, and jobs in dependency order", async () => {
    const order: string[] = [];

    const moduleA: ServerAppModule = {
      id: "a",
      version: "1.0.0",
      label: "A",
      kind: "infrastructure",
      server: {
        registerProviders: () => order.push("a:providers"),
        registerRoutes: async () => {
          order.push("a:routes");
        },
      },
    };

    const moduleB: ServerAppModule = {
      id: "b",
      version: "1.0.0",
      label: "B",
      kind: "business",
      requires: ["a"],
      server: {
        registerRoutes: async () => {
          order.push("b:routes");
        },
        registerJobs: () => {
          order.push("b:jobs");
        },
      },
    };

    const app = createMockApp();
    const loader = new ModuleLoader([moduleB, moduleA]);
    await loader.registerAll(app);

    expect(order).toEqual([
      "a:providers",
      "a:routes",
      "b:routes",
      "b:jobs",
    ]);
    expect(loader.getJobRegistry().getJobs()).toHaveLength(0);
  });

  it("runs onBoot hooks in module order", async () => {
    const order: string[] = [];
    const modules: ServerAppModule[] = [
      {
        id: "x",
        version: "1.0.0",
        label: "X",
        kind: "business",
        server: {
          onBoot: async () => {
            order.push("x");
          },
        },
      },
    ];

    const loader = new ModuleLoader(modules);
    await loader.runBootHooks(createMockApp());
    expect(order).toEqual(["x"]);
  });
});
