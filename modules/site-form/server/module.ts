import { registerTenantGatedRoutes } from "@rewindom/module-sdk/server";

import { SITE_FORM_ENTITLEMENT } from "../shared/entitlements.js";

import { formSubmissionRoutes } from "./form-submission.routes.js";
import { SITE_FORM_SERVER_I18N } from "./i18n.js";
import { publicSiteFormRoutes } from "./public-form.routes.js";
import { registerSiteFormSection } from "./register.js";

import type { ServerAppModule } from "@rewindom/module-sdk/server";

export const siteFormServerModule: ServerAppModule = {
  id: "site-form",
  version: "1.0.0",
  label: "Site forms",
  kind: "business",
  description: "官网表单段与提交记录",
  requires: ["rbac", "audit", "marketing"],
  tenantEntitlements: [SITE_FORM_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "form.read",
        label: "查看表单提交",
        group: "站点表单",
        description: "查看官网表单收到的提交",
      },
      {
        key: "form.write",
        label: "管理表单提交",
        group: "站点表单",
        description: "删除官网表单提交",
      },
    ],
    auditActions: [
      { action: "SITE_FORM_SUBMISSION_DELETE", label: "删除官网表单提交" },
    ],
  },
  server: {
    i18n: SITE_FORM_SERVER_I18N,
    onBoot: async () => {
      registerSiteFormSection();
    },
    registerRoutes: async (app) => {
      /*
       * 公开提交口不进 entitlement 网关：那层要的是工作台的租户上下文，而这里是
       * 访客。租户没开通表单时段本来就不渲染，提交也就找不到那个段 → 404。
       */
      await app.register(publicSiteFormRoutes, {
        prefix: "/api/public/site-form",
      });
      await registerTenantGatedRoutes(
        app,
        SITE_FORM_ENTITLEMENT.key,
        async (scoped) => {
          await scoped.register(formSubmissionRoutes, {
            prefix: "/api/site-form",
          });
        },
      );
    },
  },
};
