import { FileText, Globe, Image as ImageIcon, Inbox } from "lucide-react";

import type { AppNavSection } from "@be-water/client-kit";

/**
 * 「站点」分组：一项一类**内容集合**（页面、表单提交、媒体、文档）——租户在那里
 * 写东西、看东西，会反复回来。媒体库留在这里：图片是内容，会被反复挑选、上传、替换。
 *
 * **编辑器不在这里，一项都没有。** 它曾经占过两项（「外观」指主题层、页面从列表进），
 * 三个编辑器合成一个之后这不成立了：`isNavRouteActive` 只看 pathname，
 * `/app/site/editor` 的两层共用同一个路径，侧栏没法分辨——不管在改主题还是在排某一页，
 * 高亮的永远是同一项。两个入口指同一个界面，本来也说不清点哪个会去哪。
 *
 * 编辑器的入口因此**统一在页面列表的行上**（`?page=<id>`）——从要编辑的那个
 * 东西点进去；卡头不再挂「编辑某某」，避免和列表重复、也避免按钮名对不齐落点。
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
