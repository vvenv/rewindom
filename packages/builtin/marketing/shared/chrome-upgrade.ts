/**
 * 把旧版页头 / 页脚（settings 里塞导航与开关）升级为 block 组合。
 *
 * 在 `buildSection` 里逐段调用——读写两条路径都经过它，租户保存后即落新格式。
 */

import {
  createBlock,
  settingBool,
  settingText,
  type SettingValues,
  type SiteBlock,
  type SiteSection,
} from "./section-schema.js";
import { isLocalizedText, type LocalizedText } from "./section-settings.js";
import { settingNavItems } from "./site-nav.js";

/**
 * 取一个旧键的文案值，多语言表原样带过去。
 *
 * 不能用 `settingText`：那个会把 `{ __i18n }` 压成当前语言的一个字符串，旧站的按钮
 * 文案一升级就只剩一种语言。
 */
function legacyText(
  settings: SettingValues,
  id: string,
): string | LocalizedText {
  const value = settings[id];
  if (typeof value === "string") return value;
  if (isLocalizedText(value)) return value;
  return "";
}

function legacyTextIsEmpty(value: string | LocalizedText): boolean {
  return typeof value === "string"
    ? value.trim() === ""
    : Object.values(value.__i18n).every((text) => text.trim() === "");
}

const CHROME_BLOCK_PREFIX = "chrome_";

const LEGACY_HEADER_SETTING_KEYS = [
  "show_logo",
  "show_site_name",
  "items",
  "show_doc_search",
  "show_locale_switcher",
  "show_theme_toggle",
  "show_account",
  "secondary_label",
  "secondary_href",
  "primary_label",
  "primary_href",
] as const;

const LEGACY_FOOTER_SETTING_KEYS = [
  "show_logo",
  "blurb",
  "copyright",
] as const;

function hasChromeBlocks(blocks: readonly SiteBlock[]): boolean {
  return blocks.some((block) => block.type.startsWith(CHROME_BLOCK_PREFIX));
}

/**
 * 这一段是不是旧版存量：settings 里还留着已从 schema 移除的旧键，且一个 chrome
 * block 都没有。
 *
 * 两个条件缺一不可。只看「有没有 chrome block」会**把删除当成缺失**——极简页脚
 * 天生只有一个版权块（没有 brand），租户又可以把块删光，这两种都是当前格式的合法
 * 形态，一升级就被塞回不想要的块，刷新一次长回来一次。旧键则只可能来自旧数据：
 * 新 schema 不认它们，写路径 parse 一遍就没了。
 */
function isLegacyChrome(section: SiteSection): boolean {
  if (hasChromeBlocks(section.blocks)) return false;
  const keys =
    section.type === "header"
      ? LEGACY_HEADER_SETTING_KEYS
      : LEGACY_FOOTER_SETTING_KEYS;
  return keys.some((key) => section.settings[key] !== undefined);
}

/** 解析时 schema 会丢掉未声明字段；升级前把存量 chrome 键从 raw 补回来。 */
export function mergeLegacyChromeSettings(
  section: SiteSection,
  raw: Record<string, unknown>,
): SiteSection {
  const keys =
    section.type === "header"
      ? LEGACY_HEADER_SETTING_KEYS
      : section.type === "footer"
        ? LEGACY_FOOTER_SETTING_KEYS
        : [];
  if (keys.length === 0) return section;
  const legacy: SettingValues = {};
  for (const key of keys) {
    if (raw[key] !== undefined) legacy[key] = raw[key] as SettingValues[string];
  }
  if (Object.keys(legacy).length === 0) return section;
  return {
    ...section,
    settings: { ...section.settings, ...legacy },
  };
}

function pickChromeShellSettings(settings: SettingValues): SettingValues {
  const out: SettingValues = {};
  if (settings.sticky !== undefined) out.sticky = settings.sticky;
  if (settings.layout !== undefined) out.layout = settings.layout;
  for (const key of [
    "bg_color",
    "fg_color",
    "border_color",
    "border_width",
    "radius",
  ] as const) {
    if (settings[key] !== undefined) out[key] = settings[key];
  }
  return out;
}

export function upgradeHeaderSection(section: SiteSection): SiteSection {
  if (section.type !== "header" || !isLegacyChrome(section)) return section;

  const s = section.settings;
  const blocks: SiteBlock[] = [
    createBlock("header", "chrome_brand", {
      show_logo: settingBool(s, "show_logo"),
      show_site_name: settingBool(s, "show_site_name"),
    }),
    createBlock("header", "chrome_nav", {
      items: settingNavItems(s),
    }),
  ];

  if (settingBool(s, "show_doc_search")) {
    blocks.push(createBlock("header", "chrome_doc_search", {}));
  }
  if (settingBool(s, "show_locale_switcher")) {
    blocks.push(createBlock("header", "chrome_locale", {}));
  }
  if (settingBool(s, "show_theme_toggle")) {
    blocks.push(createBlock("header", "chrome_theme", {}));
  }
  if (settingBool(s, "show_account")) {
    blocks.push(createBlock("header", "chrome_account", {}));
  }

  // 旧版页头最多两颗按钮（次要 + 主要），按同样的顺序落成两个 chrome_button
  for (const [labelKey, hrefKey, variant] of [
    ["secondary_label", "secondary_href", "ghost"],
    ["primary_label", "primary_href", "primary"],
  ] as const) {
    const label = legacyText(s, labelKey);
    const href = settingText(s, hrefKey);
    if (legacyTextIsEmpty(label) || !href) continue;
    blocks.push(
      createBlock("header", "chrome_button", { label, href, variant }),
    );
  }

  return {
    ...section,
    settings: pickChromeShellSettings(s),
    blocks,
  };
}

export function upgradeFooterSection(section: SiteSection): SiteSection {
  if (section.type !== "footer" || !isLegacyChrome(section)) return section;

  const s = section.settings;
  // 旧版页脚的链接列本来就是 `menu_column` block，原样留着——只有品牌与版权要从
  // settings 搬进块里（`isLegacyChrome` 已保证这里没有任何 chrome 块）
  const menuColumns = section.blocks.filter(
    (block) => block.type === "menu_column",
  );

  const blocks: SiteBlock[] = [
    createBlock("footer", "chrome_brand", {
      show_logo: settingBool(s, "show_logo"),
      show_site_name: true,
      blurb: legacyText(s, "blurb"),
    }),
    ...menuColumns,
    createBlock("footer", "chrome_copyright", {
      text: legacyText(s, "copyright"),
    }),
  ];

  return {
    ...section,
    settings: pickChromeShellSettings(s),
    blocks,
  };
}

export function upgradeChromeSection(section: SiteSection): SiteSection {
  if (section.type === "header") return upgradeHeaderSection(section);
  if (section.type === "footer") return upgradeFooterSection(section);
  return section;
}
