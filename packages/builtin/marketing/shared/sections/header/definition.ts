import { MAIN_MENU_KEY } from "../../site-menu.js";
import { linkSettings, styleSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const headerSection: SectionDefinition = {
  type: "header",
  label: "editor.sectionType.header",
  placements: ["header"],
  settings: [
    { type: "header", content: "editor.group.brand" },
    {
      type: "checkbox",
      id: "show_logo",
      label: "editor.setting.show_logo",
      default: true,
    },
    {
      type: "checkbox",
      id: "show_site_name",
      label: "editor.setting.show_site_name",
      default: true,
    },
    {
      type: "checkbox",
      id: "sticky",
      label: "editor.setting.sticky",
      default: true,
    },
    /*
     * 页头右侧那一排「显示什么」集中在这一组。
     *
     * 四项都是**同一类决定**（这枚入口露不露），能力本身是否具备则各由别处保证：
     * 多语言看站点建了几种语言的页面、明暗看系统内置（永远跟随设备）、账户看租户
     * 有没有开通会员。所以它们该并排摆在页头里，而不是散到站点设置 / 品牌页去
     * ——语言切换器原来就在站点设置里，租户得跑两个地方配同一排按钮。
     */
    { type: "header", content: "editor.group.headerItems" },
    /*
     * 导航内容整个交给菜单。
     *
     * 这里以前是「一个 `show_site_nav` 开关 + 一串 `nav_link` 块」：自动列出的一级
     * 页面永远在前，自定义链接只能追加在后，想把「定价」插到「关于」前面做不到；
     * 同一批链接要在页脚再出现一次就得原样配第二遍。现在两者都是菜单里的条目，
     * 顺序随便拖，页脚指同一个 key 即可复用。
     */
    {
      type: "menu",
      id: "menu",
      label: "editor.setting.header_menu",
      default: MAIN_MENU_KEY,
      info: "editor.info.header_menu",
    },
    // 候选语言来自本页 `alternates`——只列真有译文的语言，所以单语言站点开了也不会露
    {
      type: "checkbox",
      id: "show_locale_switcher",
      label: "editor.setting.show_locale_switcher",
      default: false,
      info: "editor.info.show_locale_switcher",
    },
    /*
     * 文档搜索入口：一个直接提交到文档索引的搜索框（`/docs?q=`）。
     *
     * 刻意做成 `<form>` 而不是一枚要 JS 才展开的浮层——它在首屏就得能用，且文档
     * 索引那边本来就认 `?q=`（没有 JS 时那一跳也只是列出全部文档，不会是空白页）。
     * 站点还没有任何已发布文档时不渲染：一个搜不出东西的搜索框比没有更糟。
     */
    {
      // 默认开：它是文档搜索的**唯一**入口（`doc-list` 段内那个框已经删了），
      // 默认关等于默认没有搜索。站里没有已发布文档时它本来就不渲染。
      type: "checkbox",
      id: "show_doc_search",
      label: "editor.setting.show_doc_search",
      default: true,
      info: "editor.info.show_doc_search",
    },
    /*
     * 明暗模式本身是内置的、且永远跟随设备；这个开关只决定**要不要给访客一枚
     * 手动切换按钮**。关掉不等于强制浅色，只是不让访客改。
     */
    {
      type: "checkbox",
      id: "show_theme_toggle",
      label: "editor.setting.show_theme_toggle",
      default: false,
      info: "editor.info.show_theme_toggle",
    },
    /*
     * 会员入口：未登录是「登录」，已登录是头像 + 账户下拉（账户页 / 退出登录）。
     * 由 site-member 通过 `siteMemberEntrySlot` 填入，站点没开通会员时它自己
     * 什么都不渲染——这个开关是给**开通了**、但不想在页头露出入口的站长用的。
     */
    {
      type: "checkbox",
      id: "show_account",
      label: "editor.setting.show_account",
      default: true,
      info: "editor.info.show_account",
    },
    { type: "header", content: "editor.group.buttons" },
    /*
     * 这两枚按钮**不**默认成登录入口：登录 / 账户已经由上面的会员入口负责。
     * 再给次按钮配一个默认的登录链接，未登录时页头会并排出现两个「登录」。
     */
    ...linkSettings("secondary"),
    ...linkSettings("primary"),
    ...styleSettings(),
  ],
};
