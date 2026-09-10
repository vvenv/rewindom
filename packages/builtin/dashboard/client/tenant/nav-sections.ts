import { APP_NAV_SECTION_ORDER, type AppNavSection } from "@rewindom/client-kit";
import { LayoutDashboard } from "lucide-react";


export const DASHBOARD_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "dashboard:nav.sectionOverview",
    order: APP_NAV_SECTION_ORDER.overview,
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
