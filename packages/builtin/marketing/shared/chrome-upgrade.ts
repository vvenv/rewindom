/**
 * 把旧版页头 / 页脚（settings 里塞导航与开关）升级为 block 组合。
 *
 * 读路径在 `ensureAreaBody` 之后调用；写路径走正常 parse，租户保存后即落新格式。
 */

import {
  createBlock,
  settingBool,
  settingText,
  type SettingValues,
  type SiteBlock,
  type SiteSection,
} from "./section-schema.js";
import { settingNavItems } from "./site-nav.js";

const CHROME_BLOCK_PREFIX = "chrome_";

function hasChromeBlocks(blocks: readonly SiteBlock[]): boolean {
  return blocks.some((block) => block.type.startsWith(CHROME_BLOCK_PREFIX));
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
  if (section.type !== "header" || hasChromeBlocks(section.blocks)) {
    return section;
  }

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

  const secondaryLabel = settingText(s, "secondary_label");
  const secondaryHref = settingText(s, "secondary_href");
  if (secondaryLabel && secondaryHref) {
    blocks.push(
      createBlock("header", "chrome_button", {
        label: secondaryLabel,
        href: secondaryHref,
        variant: "ghost",
      }),
    );
  }

  const primaryLabel = settingText(s, "primary_label");
  const primaryHref = settingText(s, "primary_href");
  if (primaryLabel && primaryHref) {
    blocks.push(
      createBlock("header", "chrome_button", {
        label: primaryLabel,
        href: primaryHref,
        variant: "primary",
      }),
    );
  }

  return {
    ...section,
    settings: pickChromeShellSettings(s),
    blocks,
  };
}

export function upgradeFooterSection(section: SiteSection): SiteSection {
  if (section.type !== "footer") return section;
  if (section.blocks.some((block) => block.type === "chrome_brand")) {
    return section;
  }

  const s = section.settings;
  const menuColumns = section.blocks.filter(
    (block) => block.type === "menu_column",
  );
  const existingCopyright = section.blocks.find(
    (block) => block.type === "chrome_copyright",
  );
  const copyrightText =
    settingText(existingCopyright?.settings ?? {}, "text") ||
    settingText(s, "copyright");

  const blocks: SiteBlock[] = [
    createBlock("footer", "chrome_brand", {
      show_logo: settingBool(s, "show_logo"),
      show_site_name: true,
      blurb: settingText(s, "blurb"),
    }),
    ...menuColumns,
    existingCopyright ??
      createBlock("footer", "chrome_copyright", { text: copyrightText }),
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

export function upgradeChromeSections(sections: SiteSection[]): SiteSection[] {
  return sections.map((section) =>
    section.type === "header" || section.type === "footer"
      ? upgradeChromeSection(section)
      : section,
  );
}
