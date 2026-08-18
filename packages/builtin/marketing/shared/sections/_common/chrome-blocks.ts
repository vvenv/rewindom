/**
 * 页头 / 页脚的块定义 —— 两个区域**完全共用**一套。
 *
 * 核心口径：**块落在哪里由块自己说了算，不由它的 type 说了算**。
 *
 * 以前是反过来的：`partitionHeaderBlocks` 把品牌钉在左、导航钉在中、按钮钉在右，
 * 页脚则把链接列钉在上排、语言钉在底栏。租户能调的只有同一堆里的先后顺序，想把
 * 按钮放到导航左边、把语言收进页头，都得改代码；于是每来一种新排法就多一个
 * 「版式」下拉（`layout: split | centered`）去兜——那是缺少定位能力的补丁。
 *
 * 现在每个块带三个定位设置：
 *
 * | 设置     | 说明                                                       |
 * | -------- | ---------------------------------------------------------- |
 * | `row`    | 第几行（最多 3 行，空行不渲染）                            |
 * | `align`  | 行内靠左 / 居中 / 靠右                                     |
 * | `mobile` | 窄屏：留在外面 / 收进汉堡菜单 / 不显示                     |
 *
 * 「导航居中」= 导航块 `align: center`。「页脚底栏」= 版权块 `row: 2`。
 * 「页头分两行」= 把块分到两行。不再需要任何版式预设。
 */

import {
  defaultHeaderNavItems,
  settingNavItems,
  type SiteNavItem,
} from "../../site-nav.js";

import type { SettingDef } from "../../section-settings.js";
import type { BlockDefinition, SiteBlock } from "../types.js";

/** 一个 chrome 区域最多几行。三行足够（主行 + 副行 + 底栏），再多就该用段了。 */
export const CHROME_ROW_COUNT = 3;

export type ChromeAlign = "start" | "center" | "end";
export type ChromeMobile = "pin" | "menu" | "hide";

/**
 * 每个 chrome 块都有的定位设置。
 *
 * 单独一个函数而不是抄到每个块里：漏一个，那个块就永远只能待在第一行左边，而这种
 * 「某个块的设置面板少一项」在编辑器里非常难发现。
 */
/** 贡献进来的 chrome 块也必须带这三项，否则永远钉在第一行左边。 */
export function chromeSlotSettings(defaults: {
  row?: number;
  align?: ChromeAlign;
  mobile?: ChromeMobile;
}): SettingDef[] {
  return [
    { type: "header", content: "editor.group.chrome_slot", group: "layout" },
    {
      type: "select",
      id: "row",
      label: "editor.setting.chrome_row",
      default: String(defaults.row ?? 1),
      options: Array.from({ length: CHROME_ROW_COUNT }, (_, index) => ({
        value: String(index + 1),
        label: `editor.option.chrome_row.${index + 1}`,
      })),
      info: "editor.info.chrome_row",
    },
    {
      type: "select",
      id: "align",
      label: "editor.setting.chrome_align",
      default: defaults.align ?? "start",
      options: [
        { value: "start", label: "editor.option.chrome_align.start" },
        { value: "center", label: "editor.option.chrome_align.center" },
        { value: "end", label: "editor.option.chrome_align.end" },
      ],
    },
    {
      type: "select",
      id: "mobile",
      label: "editor.setting.chrome_mobile",
      default: defaults.mobile ?? "menu",
      options: [
        { value: "pin", label: "editor.option.chrome_mobile.pin" },
        { value: "menu", label: "editor.option.chrome_mobile.menu" },
        { value: "hide", label: "editor.option.chrome_mobile.hide" },
      ],
      info: "editor.info.chrome_mobile",
    },
  ];
}

export const CHROME_BRAND_BLOCK: BlockDefinition = {
  type: "chrome_brand",
  label: "editor.blockType.chrome_brand",
  singleton: true,
  settings: [
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
    /*
     * 字标文案。留空回落站名。
     *
     * 站名同时是首页 `<title>` 与其余页面的标题后缀，按 SEO 写就会长；那条长句子
     * 该给搜索引擎，不该顶在 logo 旁边。两者是两件事，各给一个位置。
     * 无 `default`：有默认值就得在每次建块时展开成 `__i18n`，而这里的默认不是
     * 某句文案，是「跟着站名走」——只能在渲染期回落。
     */
    {
      type: "text",
      id: "brand_text",
      label: "editor.setting.brand_text",
      info: "editor.info.brand_text",
    },
    {
      type: "textarea",
      id: "blurb",
      label: "editor.setting.blurb",
      rows: 2,
      info: "editor.info.chrome_blurb",
    },
    // 品牌是站点身份，窄屏永远留在外面
    ...chromeSlotSettings({ align: "start", mobile: "pin" }),
  ],
};

/**
 * 导航：一份条目 + 一个「横排还是竖列」。
 *
 * 以前是两个 type——页头的 `chrome_nav` 与页脚的 `menu_column`，存的东西一模一样
 * （都是 `settings.items`），差别只在画成一排还是一列。那是**显示方式**，不是两种
 * 东西；分成两个 type 的直接后果是页头摆不出竖列、页脚摆不出横排（底栏那排法务
 * 链接因此只能作为字段塞进版权块里）。
 */
export const CHROME_NAV_BLOCK: BlockDefinition = {
  type: "chrome_nav",
  label: "editor.blockType.chrome_nav",
  settings: [
    {
      type: "text",
      id: "title",
      label: "editor.setting.chrome_nav_title",
      info: "editor.info.chrome_nav_title",
    },
    {
      type: "nav_items",
      id: "items",
      label: "editor.setting.chrome_nav_items",
      default: [],
      // 页头 / 页脚共用本块；编辑器只在非页头（页脚列）显示「从页头复制」
      copy_from_header: true,
      info: "editor.info.chrome_nav_items",
    },
    {
      type: "select",
      id: "display",
      label: "editor.setting.chrome_nav_display",
      default: "inline",
      options: [
        { value: "inline", label: "editor.option.chrome_nav_display.inline" },
        { value: "column", label: "editor.option.chrome_nav_display.column" },
      ],
      info: "editor.info.chrome_nav_display",
    },
    ...chromeSlotSettings({ align: "start", mobile: "menu" }),
  ],
};

/**
 * 一小段文字：版权、备案说明、页头公告。
 *
 * 占位符：`{year}`、`{site}`、`{hostname}`、`{url}`——版权行的默认值就是
 * `marketing:storefront.chrome.copyright`（落成 `© {year} {site}`）。
 * 以前这是 `chrome_copyright` 一个专用块 + 「留空则自动生成」的隐藏行为：租户在输入
 * 框里看到的是空的，前台却有字，想改成「© 2020–{year}」就没有下手的地方。占位符把
 * 那个行为摆到台面上——看得见、改得动，跨年、改站名、换绑域名照样自己跟上。
 */
export const CHROME_TEXT_BLOCK: BlockDefinition = {
  type: "chrome_text",
  label: "editor.blockType.chrome_text",
  settings: [
    {
      type: "text",
      id: "text",
      label: "editor.setting.chrome_text",
      default: "marketing:storefront.chrome.copyright",
      info: "editor.info.chrome_text",
    },
    ...chromeSlotSettings({ align: "start", mobile: "pin" }),
  ],
};

export const CHROME_BUTTON_BLOCK: BlockDefinition = {
  type: "chrome_button",
  label: "editor.blockType.chrome_button",
  settings: [
    { type: "text", id: "label", label: "editor.setting.button_label" },
    {
      type: "link",
      id: "href",
      label: "editor.setting.button_href",
      placeholder: "/pricing",
    },
    {
      type: "select",
      id: "variant",
      label: "editor.setting.button_variant",
      default: "primary",
      options: [
        { value: "primary", label: "editor.option.button_variant.primary" },
        { value: "secondary", label: "editor.option.button_variant.secondary" },
        { value: "ghost", label: "editor.option.button_variant.ghost" },
      ],
    },
    ...chromeSlotSettings({ align: "end", mobile: "menu" }),
  ],
};

export const CHROME_LOCALE_BLOCK: BlockDefinition = {
  type: "chrome_locale",
  label: "editor.blockType.chrome_locale",
  singleton: true,
  settings: [...chromeSlotSettings({ align: "end", mobile: "pin" })],
};

export const CHROME_THEME_BLOCK: BlockDefinition = {
  type: "chrome_theme",
  label: "editor.blockType.chrome_theme",
  singleton: true,
  settings: [...chromeSlotSettings({ align: "end", mobile: "pin" })],
};

export const CHROME_ACCOUNT_BLOCK: BlockDefinition = {
  type: "chrome_account",
  label: "editor.blockType.chrome_account",
  singleton: true,
  settings: [...chromeSlotSettings({ align: "end", mobile: "pin" })],
};

/**
 * 页头页脚可添加的块——**同一张表**。
 *
 * 「这个块只能放页头」是过时的限制：语言选择器摆页脚是多语言站点的通行做法，页脚
 * CTA、页头公告文字同理。哪个块在哪个区域有意义，由租户摆出来决定。
 */
export const CHROME_BLOCKS: BlockDefinition[] = [
  CHROME_BRAND_BLOCK,
  CHROME_NAV_BLOCK,
  CHROME_TEXT_BLOCK,
  CHROME_BUTTON_BLOCK,
  CHROME_LOCALE_BLOCK,
  CHROME_THEME_BLOCK,
  CHROME_ACCOUNT_BLOCK,
];

const BUILTIN_CHROME_TYPES = new Set(CHROME_BLOCKS.map((block) => block.type));

/**
 * 业务模块贡献的 chrome 块。方向与贡献段一致：注册表在消费方（marketing），
 * 模块自己把定义填进来；marketing 不反向 import。
 *
 * type 必须带模块前缀（如 `shop.cart-link`），会落进租户页头 / 页脚的存储里。
 */
const CONTRIBUTED_CHROME = new Map<string, BlockDefinition>();

export function registerChromeBlock(definition: BlockDefinition): void {
  if (BUILTIN_CHROME_TYPES.has(definition.type)) {
    throw new Error(`site.chrome_block_type_conflict:${definition.type}`);
  }
  if (!definition.type.includes(".")) {
    throw new Error(`site.chrome_block_type_invalid:${definition.type}`);
  }
  const existing = CONTRIBUTED_CHROME.get(definition.type);
  if (existing && existing !== definition) {
    throw new Error(`site.chrome_block_type_conflict:${definition.type}`);
  }
  CONTRIBUTED_CHROME.set(definition.type, definition);
}

export function contributedChromeBlocks(): BlockDefinition[] {
  return [...CONTRIBUTED_CHROME.values()];
}

export function getContributedChromeBlock(
  type: string,
): BlockDefinition | undefined {
  return CONTRIBUTED_CHROME.get(type);
}

/** 仅供测试。 */
export function resetChromeBlockContributions(): void {
  CONTRIBUTED_CHROME.clear();
}

/* -------------------------------------------------------------------------- */
/* 取值（渲染端与编辑器共用，别到处写 as string）                              */
/* -------------------------------------------------------------------------- */

export function blockRow(block: SiteBlock): number {
  const raw = Number(block.settings.row);
  return Number.isInteger(raw) && raw >= 1 && raw <= CHROME_ROW_COUNT ? raw : 1;
}

export function blockAlign(block: SiteBlock): ChromeAlign {
  const raw = block.settings.align;
  return raw === "center" || raw === "end" ? raw : "start";
}

export function blockMobile(block: SiteBlock): ChromeMobile {
  const raw = block.settings.mobile;
  return raw === "pin" || raw === "hide" ? raw : "menu";
}

/**
 * 页头上现在挂着的导航条目（跨页头区所有段的所有导航块，按出现顺序拼起来）。
 * 页脚导航的「从页头复制」拿它当源。
 */
export function collectHeaderNavItems(
  sections: readonly { blocks: readonly SiteBlock[] }[],
): SiteNavItem[] {
  return sections.flatMap((section) =>
    section.blocks
      .filter((block) => block.type === "chrome_nav")
      .flatMap((block) => settingNavItems(block.settings)),
  );
}

/** 建站默认页头导航：仅「全部一级页面」平铺。 */
export function defaultChromeNavItems(): SiteNavItem[] {
  return defaultHeaderNavItems();
}
