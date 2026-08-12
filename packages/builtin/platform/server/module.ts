import { ensureBootstrapPlatformAdmin } from "@be-water/server-kernel/kernel/auth/platform-admin.service.js";
import { config as appConfig } from "@be-water/server-kernel/lib/config.js";

import { PLATFORM_SERVER_I18N } from "./i18n.js";
import { platformRoutes } from "./platform.routes.js";
import { registerPublicPlanRoutes } from "./routes/plan-pricing.routes.js";
import { tenantEntitlementsRoutes } from "./routes/tenant-entitlements.routes.js";
import { getPlatformSettings } from "./services/platform-settings.service.js";
import {
  registerOAuthTenant,
  registerTenant,
} from "./services/tenant-registration.service.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const platformServerModule: ServerAppModule = {
  id: "platform",
  version: "1.0.0",
  label: "Platform Admin",
  kind: "infrastructure",
  description: "平台管理员：租户、用户、备份、套餐等 API",
  requires: ["rbac", "audit", "background-job"],
  shared: {
    permissions: [
      /*
       * 目前**没有任何页面或路由消费**这两个权限：品牌页已并入站点外观、
       * 第三方登录已并入会员页（各自改用 `site.*` / `site_members.*`）。
       *
       * 刻意保留：`docs/design/tenant-config.md` §2.2 排着队的租户级 BYOK
       *（`openai_api_key` 等）落地时就是它俩。别当死代码删。
       */
      {
        key: "settings.read",
        label: "查看租户设置",
        group: "系统设置",
        scope: "tenant",
      },
      {
        key: "settings.write",
        label: "管理租户设置",
        group: "系统设置",
        scope: "tenant",
      },
      {
        key: "platform.tenants.read",
        label: "查看租户",
        group: "平台管理",
        scope: "platform",
      },
      {
        key: "platform.tenants.write",
        label: "管理租户",
        group: "平台管理",
        scope: "platform",
      },
      {
        key: "platform.settings.read",
        label: "查看平台设置",
        group: "平台管理",
        scope: "platform",
      },
      {
        key: "platform.settings.write",
        label: "管理平台设置",
        group: "平台管理",
        scope: "platform",
      },
      {
        key: "platform.backup",
        label: "数据备份",
        group: "平台管理",
        scope: "platform",
      },
      {
        key: "platform.roles.read",
        label: "查看平台角色",
        group: "平台权限",
        scope: "platform",
      },
      {
        key: "platform.roles.write",
        label: "管理平台角色",
        group: "平台权限",
        scope: "platform",
      },
      {
        key: "platform.roles.assign",
        label: "分配平台角色",
        group: "平台权限",
        scope: "platform",
      },
      {
        key: "platform.admins.read",
        label: "查看平台管理员",
        group: "平台权限",
        scope: "platform",
      },
      {
        key: "platform.admins.write",
        label: "管理平台管理员",
        group: "平台权限",
        scope: "platform",
      },
      {
        key: "platform.admins.assign",
        label: "分配平台管理员角色",
        group: "平台权限",
        scope: "platform",
      },
    ],
  },
  server: {
    i18n: PLATFORM_SERVER_I18N,
    onBoot: async () => {
      await ensureBootstrapPlatformAdmin();
    },
    registerProviders: (registry) => {
      registry.setPublicConfigProvider({
        getPublicConfig: async (options) => {
          const settings = await getPlatformSettings();
          const hostTenant = options?.bound_tenant ?? null;
          /*
           * 绑定域名的登录页**不再挂租户品牌**：中台外壳一律是产品自己的 Logo /
           * Favicon。品牌是站点的资产（`theme_settings`），只作用于官网。
           */
          const bound_tenant = hostTenant
            ? { slug: hostTenant.tenant_slug, name: hostTenant.name }
            : null;
          return {
            registration_enabled: settings.registration_enabled,
            captcha_enabled: settings.captcha_enabled,
            default_locale: settings.default_locale,
            single_tenant: appConfig.tenant.singleTenant,
            bound_tenant,
            tenant_base_domain: appConfig.tenant.baseDomain.trim() || null,
            platform_url: appConfig.platform.url.trim() || null,
          };
        },
      });
      registry.setTenantRegistrationProvider({
        registerTenant: (input, jwtSign, ip, userAgent, options) =>
          registerTenant(input, jwtSign, ip, userAgent, options),
        registerOAuthTenant: (input, jwtSign, ip, userAgent, options) =>
          registerOAuthTenant(input, jwtSign, ip, userAgent, options),
      });
    },
    registerRoutes: async (app) => {
      await app.register(platformRoutes, { prefix: "/api/platform" });
      await app.register(tenantEntitlementsRoutes, { prefix: "/api/settings" });
      // 公开定价：官网定价区与主题编辑器预览都读它，免认证（本就印在公开页上）
      await app.register(registerPublicPlanRoutes, { prefix: "/api/public" });
    },
  },
};
