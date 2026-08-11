import { FileText, Globe, Image as ImageIcon, Inbox, Signpost } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/**
 * 「站点」分组：一项一类**内容集合**（页面、表单提交、媒体、重定向、文档）。
 *
 * 页头页脚编辑器（`/app/site/chrome`）**刻意不在这里**：它和 Theme Editor
 * （`/app/site/pages/:pageId`）是同一种东西——一个对象的全屏编辑器，不是一类内容。
 * 编辑器从它编辑的东西点进去，所以入口在官网卡片上（`SiteSummaryHeader`），
 * 与 Theme Editor 从页面列表点进去同一口径。
 */
export const SITE_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "marketing:cms.navSection",
    items: [
      {
        icon: Globe,
        label: "marketing:cms.nav",
        // end:true：精确匹配，避免与 /app/site/docs 等兄弟菜单同时高亮
        path: "/app/site",
        end: true,
        title: "marketing:cms.nav",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
      {
        icon: Inbox,
        label: "marketing:formSubmissions.nav",
        path: "/app/site/form-submissions",
        title: "marketing:formSubmissions.title",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
      {
        icon: ImageIcon,
        label: "marketing:media.nav",
        path: "/app/site/media",
        title: "marketing:media.title",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
      {
        icon: Signpost,
        label: "marketing:redirects.nav",
        path: "/app/site/redirects",
        title: "marketing:redirects.title",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
      {
        icon: FileText,
        label: "marketing:siteDocs.nav",
        path: "/app/site/docs",
        // 不是 siteDocs.title——那个是列表里「标题」这一列的表头
        title: "marketing:siteDocs.pageTitle",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
    ],
  },
];
