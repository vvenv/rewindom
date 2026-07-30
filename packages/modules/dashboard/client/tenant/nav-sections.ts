import { LayoutDashboard } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

export const DASHBOARD_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "概览",
    items: [
      {
        icon: LayoutDashboard,
        label: "工作台",
        path: "/dashboard",
        title: "工作台",
        keywords: "dashboard 工作台 首页 概览",
        // 无子路由，用精确匹配，避免前缀匹配把别的路径也点亮
        end: true,
      },
    ],
  },
];
