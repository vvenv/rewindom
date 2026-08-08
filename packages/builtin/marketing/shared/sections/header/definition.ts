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
    // 全站导航 = 已发布一级页面（父路径 `/`）；自定义 `nav_link` 块始终追加在后。
    {
      type: "checkbox",
      id: "show_site_nav",
      label: "editor.setting.show_site_nav",
      default: true,
      info: "editor.info.show_site_nav",
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
  max_blocks: 8,
  blocks: [
    {
      type: "nav_link",
      label: "editor.blockType.nav_link",
      settings: [
        {
          type: "text",
          id: "label",
          label: "editor.setting.label",
          default: "Link",
          required: true,
        },
        {
          type: "url",
          id: "href",
          label: "editor.setting.href",
          default: "/",
        },
      ],
    },
  ],
};
