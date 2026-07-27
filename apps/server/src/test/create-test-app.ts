
import { createRouteTestApp, type RouteTestAppOptions, type TestApp } from "@be-water/server-test";

import { attachKernelContext, registerAllRoutes } from "../routes/index.js";

import type { FastifyInstance } from "fastify";

export async function createTestApp(
  options?: RouteTestAppOptions,
): Promise<TestApp> {
  return createRouteTestApp(async (app: FastifyInstance) => {
    attachKernelContext(app);
    await registerAllRoutes(app);
  }, options);
}
