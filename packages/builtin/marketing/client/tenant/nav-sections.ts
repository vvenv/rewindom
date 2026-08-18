import { Globe, Image as ImageIcon } from "lucide-react";

import type { AppNavSection } from "@rewindom/client-kit";

/**
 * 「站点」分组：一项一类**内容集合**（页面、媒体）——租户在那里
 * 写东西、看东西，会反复回来。媒体库留在这里：图片是内容，会被反复挑选、上传、替换。
 *
 * 表单提交不在这里：它随表单段一起归 `site-form` 模块，由那边往本分组填一项
 *（`marketing:cms.navSection`），与文档库同一条路子。
 *
 * **编辑器不在这里，一项都没有。** 页面从列表行进；外观从官网卡片「外观」进
 * （`/app/site/editor?scope=theme`）。曾经占过两项（「外观」与页面列表），但
 * `isNavRouteActive` 只看 pathname，两层共用 `/app/site/editor` 时侧栏没法分辨。
 *
 * 编辑器入口因此不进侧栏：页面行打开区块树（`?page=<id>`），卡片「外观」打开主题层。
 *
 * **重定向**同理不在这里：它是「旧地址怎么处理」的一条路由规则，配完就不再回来，
 * 已并入站点设置 Sheet（官网卡片 →「站点设置」→ 重定向分区）。
 */
export const SITE_NAV_SECTIONS: AppNavSection[] = [
  {
    label: "marketing:cms.navSection",
    items: [
      {
        icon: Globe,
        label: "marketing:cms.nav",
        // end:true：精确匹配，避免与 /app/site/media 等兄弟菜单同时高亮
        path: "/app/site",
        end: true,
        title: "marketing:cms.nav",
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
    ],
  },
];
