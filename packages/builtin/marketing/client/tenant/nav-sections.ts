import {
  FileText,
  Globe,
  Image as ImageIcon,
  Inbox,
  Signpost,
} from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

export const SITE_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "marketing:cms.navSection",
    items: [
      {
        icon: Globe,
        label: "marketing:cms.nav",
        path: "/app/site",
        title: "marketing:cms.nav",
        keywords: "site marketing cms 官网 站点",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
      {
        icon: Inbox,
        label: "marketing:formSubmissions.nav",
        path: "/app/site/form-submissions",
        title: "marketing:formSubmissions.title",
        keywords: "form submissions leads 表单 提交 线索",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
      {
        icon: ImageIcon,
        label: "marketing:media.nav",
        path: "/app/site/media",
        title: "marketing:media.title",
        keywords: "media library image assets 媒体 图片 素材",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
      {
        icon: Signpost,
        label: "marketing:redirects.nav",
        path: "/app/site/redirects",
        title: "marketing:redirects.title",
        keywords: "redirect 301 302 重定向 跳转",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
      {
        icon: FileText,
        label: "marketing:siteDocs.nav",
        path: "/app/site/docs",
        title: "marketing:siteDocs.title",
        keywords: "docs documentation markdown 文档 手册",
        tenantModule: "tenant-marketing",
        anyPermission: ["site.read"],
      },
    ],
  },
];
