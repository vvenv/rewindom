import { registerKernelRoutes as mountKernelRoutes } from "@be-water/server-kernel/kernel/kernel-routes.js";
import { bindAuditEventBus } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { ModuleLoader } from "@be-water/server-kernel/runtime/module-loader.js";
import { bindNotificationEventBus } from "@be-water/server-kernel/runtime/notification-emit.js";

import { ENABLED_SERVER_MODULES } from "../enabled-modules.js";

import type { FastifyInstance } from "fastify";

let moduleLoader: ModuleLoader | null = null;

function getModuleLoader(): ModuleLoader {
  if (!moduleLoader) {
    moduleLoader = new ModuleLoader(ENABLED_SERVER_MODULES);
  }
  return moduleLoader;
}

/** Kernel routes: auth, public, captcha, system-info. */
export async function registerKernelRoutes(
  app: FastifyInstance,
): Promise<void> {
  await mountKernelRoutes(app);
}

export function attachKernelContext(app: FastifyInstance): void {
  const loader = getModuleLoader();
  loader.registerProviders();
  if (!app.hasDecorator("events")) {
    app.decorate("events", loader.getEventBus());
    bindAuditEventBus(loader.getEventBus());
    bindNotificationEventBus(loader.getEventBus());
  }
  if (!app.hasDecorator("registry")) {
    app.decorate("registry", loader.getProviderRegistry());
  }
}

export async function registerModuleMiddleware(
  app: FastifyInstance,
): Promise<void> {
  attachKernelContext(app);
  const loader = getModuleLoader();
  await loader.registerMiddleware(app);
}

export async function registerAllRoutes(app: FastifyInstance): Promise<void> {
  await registerKernelRoutes(app);
  const loader = getModuleLoader();
  await loader.registerRoutes(app);
  loader.registerJobs(app);
}

export async function runModuleBootHooks(app: FastifyInstance): Promise<void> {
  await getModuleLoader().runBootHooks(app);
}

export function getServerModuleLoader(): ModuleLoader {
  return getModuleLoader();
}
