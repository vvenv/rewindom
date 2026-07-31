import { LayoutDashboard } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

export const DASHBOARD_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "dashboard:nav.sectionOverview",
    items: [
      {
        icon: LayoutDashboard,
        label: "dashboard:nav.dashboard",
        path: "/dashboard",
        title: "dashboard:nav.dashboard",
        keywords: "dashboard 工作台 首页 概览",
        end: true,
      },
    ],
  },
];
