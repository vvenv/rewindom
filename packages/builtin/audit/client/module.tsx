import { renderAuditPlatformRoutes } from "./AuditRoutes.js";
import { AUDIT_I18N } from "./i18n.js";
import { auditPlatformNavContributions } from "./platform/nav-contributions.js";
import { AUDIT_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderAuditTenantRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const auditClientModule: ClientAppModule = {
  id: "audit",
  version: "1.0.0",
  label: "Audit Logs",
  kind: "infrastructure",
  description: "平台与租户审计日志页面",
  client: {
    i18n: AUDIT_I18N,
    renderRoutes: renderAuditTenantRoutes,
    nav: AUDIT_NAV_SECTIONS,
    renderPlatformRoutes: renderAuditPlatformRoutes,
    platformNav: auditPlatformNavContributions,
  },
};
