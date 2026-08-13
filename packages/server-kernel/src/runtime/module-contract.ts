import { type ModuleManifestBase } from "@rewindom/shared";

import type { EventBus } from "./event-bus.js";
import type { JobRegistryContext } from "./job-registry.js";
import type { ProviderRegistry } from "./provider-registry.js";
import type { ServerI18nBundle } from "../lib/i18n/types.js";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

export type { ServerI18nBundle };

export interface ServerModuleContext {
  app: FastifyInstance;
  registry: ProviderRegistry;
  events: EventBus;
  log: FastifyInstance["log"];
}

export interface BootContext {
  app: FastifyInstance;
  registry: ProviderRegistry;
  events: EventBus;
  log: FastifyInstance["log"];
}

export interface ServerRouteRegistration {
  plugin: FastifyPluginAsync | ((app: FastifyInstance) => Promise<void>);
  prefix: string;
}

export interface ServerAppModule extends ModuleManifestBase {
  server?: {
    registerMiddleware?: (
      app: FastifyInstance,
      ctx: ServerModuleContext,
    ) => Promise<void>;
    registerRoutes?: (
      app: FastifyInstance,
      ctx: ServerModuleContext,
    ) => Promise<void>;
    registerJobs?: (ctx: JobRegistryContext) => void;
    onBoot?: (ctx: BootContext) => Promise<void>;
    registerProviders?: (registry: ProviderRegistry) => void;
    /**
     * 本模块 API / 审计模板文案（按稳定 code）。
     * 组装层在路由注册前 `registerServerI18nBundles(collectServerI18nBundles(...))`。
     */
    i18n?: ServerI18nBundle;
  };
}
