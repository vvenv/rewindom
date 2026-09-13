import { type CommandAction } from "@rewindom/client-kit";
import { Palette } from "lucide-react";

import { siteEditorPath } from "../lib/site-editor-url.js";

/**
 * 编辑器的两层入口都进不了侧栏（见 `nav-sections.ts` 的说明：`isNavRouteActive`
 * 只看 pathname，两层共用 `/app/site/editor` 时高亮分不开），于是「外观」只能从
 * 官网卡片点进去——知道的人才找得到。
 *
 * 命令面板正是为这种去处准备的：不占侧栏一格，也不必先绕到官网卡片。
 * 页面区块层不在这里——它必须先选一张页面（`?page=<id>`），不是一个固定地址。
 */
export const MARKETING_COMMAND_ACTIONS: readonly CommandAction[] = [
  {
    id: "marketing.site-theme",
    label: "marketing:cms.settingsSectionTheme",
    icon: Palette,
    path: siteEditorPath({ scope: "theme" }),
    tenantModule: "tenant-marketing",
    anyPermission: ["site.read"],
  },
];
