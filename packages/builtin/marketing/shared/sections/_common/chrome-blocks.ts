/**
 * 页头 / 页脚共用的 chrome block 定义。
 *
 * 以前导航、按钮、开关都塞在 section settings 里，布局写死（品牌 | 导航 | 操作区）。
 * 改成 block 之后可以在编辑器里增删、排序，页头页脚也能共用同一套块类型。
 */

import { defaultHeaderNavItems } from "../../site-nav.js";

import type { BlockDefinition, SiteBlock } from "../types.js";

export const CHROME_BRAND_BLOCK: BlockDefinition = {
  type: "chrome_brand",
  label: "editor.blockType.chrome_brand",
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
    {
      type: "textarea",
      id: "blurb",
      label: "editor.setting.blurb",
      rows: 2,
      info: "editor.info.footer_blurb",
    },
  ],
};

export const CHROME_NAV_BLOCK: BlockDefinition = {
  type: "chrome_nav",
  label: "editor.blockType.chrome_nav",
  settings: [
    {
      type: "nav_items",
      id: "items",
      label: "editor.setting.header_menu",
      default: defaultHeaderNavItems(),
      info: "editor.info.header_menu",
    },
  ],
};

export const CHROME_BUTTON_BLOCK: BlockDefinition = {
  type: "chrome_button",
  label: "editor.blockType.chrome_button",
  settings: [
    {
      type: "text",
      id: "label",
      label: "editor.setting.button_label",
    },
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
  ],
};

export const CHROME_DOC_SEARCH_BLOCK: BlockDefinition = {
  type: "chrome_doc_search",
  label: "editor.blockType.chrome_doc_search",
  settings: [],
};

export const CHROME_LOCALE_BLOCK: BlockDefinition = {
  type: "chrome_locale",
  label: "editor.blockType.chrome_locale",
  settings: [],
};

export const CHROME_THEME_BLOCK: BlockDefinition = {
  type: "chrome_theme",
  label: "editor.blockType.chrome_theme",
  settings: [],
};

export const CHROME_ACCOUNT_BLOCK: BlockDefinition = {
  type: "chrome_account",
  label: "editor.blockType.chrome_account",
  settings: [],
};

export const CHROME_COPYRIGHT_BLOCK: BlockDefinition = {
  type: "chrome_copyright",
  label: "editor.blockType.chrome_copyright",
  settings: [
    {
      type: "text",
      id: "text",
      label: "editor.setting.copyright",
      info: "editor.info.copyright",
    },
  ],
};

/** 页头可添加的 chrome block（不含页脚专用列）。 */
export const HEADER_CHROME_BLOCKS: BlockDefinition[] = [
  CHROME_BRAND_BLOCK,
  CHROME_NAV_BLOCK,
  CHROME_BUTTON_BLOCK,
  CHROME_DOC_SEARCH_BLOCK,
  CHROME_LOCALE_BLOCK,
  CHROME_THEME_BLOCK,
  CHROME_ACCOUNT_BLOCK,
];

/** 页脚导航列（保留原 type 名，避免存量数据失效）。 */
export const FOOTER_MENU_COLUMN_BLOCK: BlockDefinition = {
  type: "menu_column",
  label: "editor.blockType.menu_column",
  settings: [
    {
      type: "text",
      id: "title",
      label: "editor.setting.column_title",
      info: "editor.info.column_title",
    },
    {
      type: "nav_items",
      id: "items",
      label: "editor.setting.menu",
      default: [],
      copy_from_header: true,
    },
  ],
};

export const FOOTER_CHROME_BLOCKS: BlockDefinition[] = [
  CHROME_BRAND_BLOCK,
  FOOTER_MENU_COLUMN_BLOCK,
  CHROME_COPYRIGHT_BLOCK,
];

const HEADER_ACTION_BLOCK_TYPES = new Set([
  "chrome_button",
  "chrome_doc_search",
  "chrome_locale",
  "chrome_theme",
  "chrome_account",
]);

export function isHeaderActionBlockType(type: string): boolean {
  return HEADER_ACTION_BLOCK_TYPES.has(type);
}

export function partitionHeaderBlocks(blocks: readonly SiteBlock[]): {
  brand: SiteBlock[];
  nav: SiteBlock[];
  actions: SiteBlock[];
} {
  const brand = blocks.filter((block) => block.type === "chrome_brand");
  const nav = blocks.filter((block) => block.type === "chrome_nav");
  const actions = blocks.filter((block) => isHeaderActionBlockType(block.type));
  return { brand, nav, actions };
}
