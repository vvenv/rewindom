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
    /**
     * 在**认证之前**挂 hook 的机会。
     *
     * `registerMiddleware` 跑在 `authMiddleware` 之后，对「先认人再干活」的模块
     * 正合适。但访问控制类的模块必须比认证更早：被封的 IP 不该先享受一遍
     * JWT 验签、租户查库和权限计算再被拒。
     *
     * 这里注册的 hook 对**所有**进入 Fastify 的请求生效，包括官网 SSR，
     * 不只是 `/api`。因此实现必须自己短路掉 `/health` 与 CORS 预检。
     */
    registerEarlyMiddleware?: (
      app: FastifyInstance,
      ctx: ServerModuleContext,
    ) => Promise<void>;
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
