import { LayoutDashboard } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

export const DASHBOARD_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "dashboard:nav.sectionOverview",
    items: [
      {
        icon: LayoutDashboard,
        label: "dashboard:nav.dashboard",
        path: "/app/dashboard",
        title: "dashboard:nav.dashboard",
        end: true,
      },
    ],
  },
];
