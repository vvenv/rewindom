import { BACKGROUND_JOB_DASHBOARD_WIDGETS } from "./dashboard-widgets.js";
import { BACKGROUND_JOB_I18N } from "./i18n.js";
import { BACKGROUND_JOB_PLATFORM_DASHBOARD_SECTIONS } from "./platform/dashboard-sections.js";
import { BackgroundJobShellProvider } from "./shell/background-job-shell-slots.js";

import type { ClientAppModule } from "@rewindom/client-kit";

export const backgroundJobClientModule: ClientAppModule = {
  id: "background-job",
  version: "1.0.0",
  label: "Background Jobs",
  kind: "infrastructure",
  description: "后台任务中心与租户布局 Provider",
  client: {
    i18n: BACKGROUND_JOB_I18N,
    dashboardWidgets: BACKGROUND_JOB_DASHBOARD_WIDGETS,
    platformDashboardSections: BACKGROUND_JOB_PLATFORM_DASHBOARD_SECTIONS,
    shell: {
      shellProviders: [BackgroundJobShellProvider],
    },
  },
};
