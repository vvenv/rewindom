import { getI18n } from "@be-water/client-kit";
import { LayoutDashboard } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

const t = (key: string): string => getI18n().t(key, { ns: "dashboard" });

export const DASHBOARD_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "dashboard:nav.sectionOverview",
    items: [
      {
        icon: LayoutDashboard,
        label: "dashboard:nav.dashboard",
        path: "/dashboard",
        title: "dashboard:nav.dashboard",
        keywords: t("nav.keywords"),
        end: true,
      },
    ],
  },
];
