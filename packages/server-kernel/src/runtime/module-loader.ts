import {
  collectServerI18nBundles,
  registerServerI18nBundles,
} from "../lib/i18n/registry.js";

import {
  collectModulePermissions,
  type MergedPermissionCatalog,
} from "./collect-module-permissions.js";
import { EventBus } from "./event-bus.js";
import { JobRegistry } from "./job-registry.js";
import { ProviderRegistry } from "./provider-registry.js";
import { topologicalSortModules } from "./topological-sort.js";

import type { BootContext, ServerAppModule, ServerModuleContext } from "./module-contract.js";
import type { FastifyInstance } from "fastify";

export class ModuleLoader {
  private readonly modules: ServerAppModule[];
  private readonly registry = new ProviderRegistry();
  private readonly events = new EventBus();
  private readonly jobRegistry = new JobRegistry();

  constructor(modules: readonly ServerAppModule[]) {
    this.modules = topologicalSortModules([...modules]);
  }

  getProviderRegistry(): ProviderRegistry {
    return this.registry;
  }

  getEventBus(): EventBus {
    return this.events;
  }

  getJobRegistry(): JobRegistry {
    return this.jobRegistry;
  }

  getSortedModules(): readonly ServerAppModule[] {
    return this.modules;
  }

  getPermissionCatalog(): MergedPermissionCatalog {
    return collectModulePermissions(this.modules);
  }

  private createServerContext(app: FastifyInstance): ServerModuleContext {
    return {
      app,
      registry: this.registry,
      events: this.events,
      log: app.log,
    };
  }

  private createBootContext(app: FastifyInstance): BootContext {
    return {
      app,
      registry: this.registry,
      events: this.events,
      log: app.log,
    };
  }

  registerProviders(): void {
    for (const module of this.modules) {
      module.server?.registerProviders?.(this.registry);
    }
  }

  async registerMiddleware(app: FastifyInstance): Promise<void> {
    const ctx = this.createServerContext(app);
    for (const module of this.modules) {
      if (module.server?.registerMiddleware) {
        app.log.debug({ moduleId: module.id }, "[module] registerMiddleware");
        await module.server.registerMiddleware(app, ctx);
      }
    }
  }

  async registerRoutes(app: FastifyInstance): Promise<void> {
    /*
     * 路由处理器抛出的 AppError 是按 code 翻的，先把各模块的 `server.i18n` 合进目录。
     *
     * 这一步归 loader 自己管，不留给组装层：漏掉它不会报任何错——`translateServerMessage`
     * 查不到 code 就原样返回，于是「原密码不正确」在页面上显示成
     * `site_member.old_password_incorrect`，而 kernel 自己的 code 照样能翻，看起来
     * 一切正常。`registerAll()` 之外还有逐步调用的组装法（apps/server 就是），
     * 那条路上真漏过。合并是幂等的，调两次没有副作用。
     */
    this.registerI18n();
    const ctx = this.createServerContext(app);
    for (const module of this.modules) {
      if (module.server?.registerRoutes) {
        app.log.debug({ moduleId: module.id }, "[module] registerRoutes");
        await module.server.registerRoutes(app, ctx);
      }
    }
  }

  registerJobs(app: FastifyInstance): void {
    for (const module of this.modules) {
      if (module.server?.registerJobs) {
        module.server.registerJobs({
          registry: this.jobRegistry,
          moduleId: module.id,
          app,
        });
      }
    }
  }

  /** 合并各模块 server.i18n（幂等）；`registerRoutes()` 已自动调，需要更早才手动调。 */
  registerI18n(): void {
    registerServerI18nBundles(collectServerI18nBundles(this.modules));
  }

  async registerAll(app: FastifyInstance): Promise<void> {
    this.registerProviders();
    await this.registerRoutes(app);
    this.registerJobs(app);
  }

  async runBootHooks(app: FastifyInstance): Promise<void> {
    const ctx = this.createBootContext(app);
    for (const module of this.modules) {
      if (module.server?.onBoot) {
        app.log.debug({ moduleId: module.id }, "[module] onBoot");
        await module.server.onBoot(ctx);
      }
    }
  }
}
