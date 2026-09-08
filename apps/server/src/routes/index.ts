import { registerKernelRoutes as mountKernelRoutes } from "@rewindom/server-kernel/kernel/kernel-routes.js";
import { bindAuditEventBus } from "@rewindom/server-kernel/runtime/audit-log-emit.js";
import { bindDomainEventBus } from "@rewindom/server-kernel/runtime/domain-event-emit.js";
import { ModuleLoader } from "@rewindom/server-kernel/runtime/module-loader.js";
import { bindNotificationEventBus } from "@rewindom/server-kernel/runtime/notification-emit.js";

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
    bindDomainEventBus(loader.getEventBus());
  }
  if (!app.hasDecorator("registry")) {
    app.decorate("registry", loader.getProviderRegistry());
  }
}

/**
 * 认证之前的模块 hook。访问控制要在 JWT 验签、租户查库、权限计算之前就把
 * 被封的请求拒掉，所以必须与 `registerModuleMiddleware` 分成两次调用。
 */
export async function registerEarlyModuleMiddleware(
  app: FastifyInstance,
): Promise<void> {
  attachKernelContext(app);
  const loader = getModuleLoader();
  await loader.registerEarlyMiddleware(app);
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
  // 各模块的 server.i18n 由 `registerRoutes` 一并合并，这里不用再调一次
  await loader.registerRoutes(app);
  loader.registerJobs(app);
}

export async function runModuleBootHooks(app: FastifyInstance): Promise<void> {
  await getModuleLoader().runBootHooks(app);
}

export function getServerModuleLoader(): ModuleLoader {
  return getModuleLoader();
}
