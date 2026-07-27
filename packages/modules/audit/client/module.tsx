import { renderAuditPlatformRoutes } from "./AuditRoutes.js";
import { auditPlatformNavContributions } from "./platform/nav-contributions.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const auditClientModule: ClientAppModule = {
  id: "audit",
  version: "1.0.0",
  label: "Audit Logs",
  kind: "infrastructure",
  description: "平台审计日志页面",
  client: {
    renderPlatformRoutes: renderAuditPlatformRoutes,
    platformNav: auditPlatformNavContributions,
  },
};
