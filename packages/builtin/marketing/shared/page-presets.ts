import {
  parseNamespacedLocaleKey,
  translateRegisteredKeyTable,
} from "@rewindom/shared";

import { DEFAULT_HOME_LAYOUT_KEY, registerHomeLayout } from "./home-layouts.js";
import {
  LANDING_HOME_LAYOUT_KEY,
  LANDING_HOME_PRESET,
} from "./landing-preset.js";
import {
  NOT_FOUND_PAGE_KIND,
  NOT_FOUND_TEMPLATE_SLUG,
  registerPageTemplatePreset,
} from "./page-templates.js";
import {
  createBlock,
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SettingValues,
  type SiteBlock,
  type SiteSection,
} from "./section-schema.js";
import { PAGE_MISSING_SECTION_TYPE } from "./sections/page-missing/definition.js";

import type {
  PagePreset,
  PresetBlock,
  PresetSection,
  PresetTranslateFn,
} from "./page-presets.types.js";

export type {
  PagePreset,
  PresetBlock,
  PresetSection,
  PresetTranslateFn,
} from "./page-presets.types.js";

/**
 * 内核首页槽位：kind=home、路径 `/`，**不预填任何段**。
 *
 * 建站 / 「重设」/ SSR 缺口的兜底；也作为 `registerHomeLayout` 的 `marketing.default`。
 * 产品首页由模块贡献版式（如 `events.home`），默认租户产品站另走
 * `default-product-site-content`。内核再塞 hero / 简介 / CTA，对真实租户都是噪音。
 */
export const HOME_STARTER_PRESET: PagePreset = {
  key: "home",
  label: "marketing:preset.home.label",
  kind: "home",
  slug: "home",
  titleKey: "marketing:preset.home.title",
  descriptionKey: "marketing:preset.home.description",
  sections: [],
};

/*
 * 把兜底版式登记进模板页注册表，快照落库与「重设为最新版式」按 kind 取它。
 * 元数据（slug / path）在 `page-templates.ts` 里就登记好了，与预设分开的理由见那边。
 */
registerPageTemplatePreset("home", HOME_STARTER_PRESET);
registerHomeLayout({
  key: DEFAULT_HOME_LAYOUT_KEY,
  label: "marketing:preset.home.layoutLabel",
  description: "marketing:preset.home.layoutDescription",
  preset: HOME_STARTER_PRESET,
});
registerHomeLayout({
  key: LANDING_HOME_LAYOUT_KEY,
  label: "marketing:preset.landing.layoutLabel",
  description: "marketing:preset.landing.layoutDescription",
  preset: LANDING_HOME_PRESET,
});

/**
 * 404 起步版式：必备的 `page-missing` 段 + 回首页。租户改文案、加段、换按钮；
 * 这一段本身删不掉。没发布这张页时 SSR 用同一份预设段合成一页。
 */
export const NOT_FOUND_STARTER_PRESET: PagePreset = {
  key: NOT_FOUND_PAGE_KIND,
  label: "preset.not_found.label",
  kind: NOT_FOUND_PAGE_KIND,
  slug: NOT_FOUND_TEMPLATE_SLUG,
  titleKey: "marketing:preset.not_found.title",
  descriptionKey: "marketing:preset.not_found.description",
  sections: [
    {
      type: PAGE_MISSING_SECTION_TYPE,
      text: {
        headline: "marketing:storefront.pageMissing.headline",
        subhead: "marketing:storefront.pageMissing.subhead",
        primary_label: "marketing:storefront.pageMissing.primary_label",
      },
      raw: {
        code: "404",
        primary_href: "/",
        padding_top: 80,
        padding_bottom: 80,
      },
    },
  ],
};

registerPageTemplatePreset(NOT_FOUND_PAGE_KIND, NOT_FOUND_STARTER_PRESET);

/** 首页兜底版式落成真实 sections（同 `buildPresetSections`，只是入口固定为 home）。 */
export function buildHomeTemplateSections(t: PresetTranslateFn): SiteSection[] {
  return buildPresetSections(HOME_STARTER_PRESET, t);
}

function resolvePresetText(
  t: PresetTranslateFn,
  key: string,
): string | { __i18n: Record<string, string> } {
  // `ns:key` 展开成整张 `__i18n` 表。marketing 自己的预设以前不带 ns，补
  // `marketing:` 前缀再解一次，避免先 t() 成单语字符串。
  const table =
    translateRegisteredKeyTable(key) ??
    (parseNamespacedLocaleKey(key)
      ? undefined
      : translateRegisteredKeyTable(`marketing:${key}`));
  return table ? { __i18n: { ...table } } : t(key);
}

function resolveValues(
  t: PresetTranslateFn,
  text: Record<string, string> | undefined,
  raw: SettingValues | undefined,
): SettingValues {
  const out: SettingValues = { ...(raw ?? {}) };
  for (const [id, key] of Object.entries(text ?? {})) {
    out[id] = resolvePresetText(t, key);
  }
  return out;
}

/** 把预设里的一个 block 落成真实 block（容器列里的子段一并展开）。 */
export function buildPresetBlock(
  sectionType: string,
  spec: PresetBlock,
  t: PresetTranslateFn,
): SiteBlock {
  const created = createBlock(
    sectionType,
    spec.type,
    resolveValues(t, spec.text, spec.raw),
  );
  // 容器 block（列）里的子段同样走一遍预设展开
  return spec.sections
    ? {
        ...created,
        sections: spec.sections.map((child) => buildPresetSection(child, t)),
      }
    : created;
}

/** 把预设里的一段落成真实 section（`preset-merge` 按段补缺时也用它）。 */
export function buildPresetSection(
  spec: PresetSection,
  t: PresetTranslateFn,
): SiteSection {
  const base = createSection(spec.type);
  const blocks = spec.blocks
    ? spec.blocks.map((block) => buildPresetBlock(spec.type, block, t))
    : base.blocks;
  // `createSection` 已经对认不出来的 type 抛过了，这里的定义必然存在
  const definition = getSectionDefinition(spec.type)!;
  return {
    ...base,
    settings: parseSettingValues(definition.settings, {
      ...base.settings,
      ...resolveValues(t, spec.text, spec.raw),
    }),
    blocks,
  };
}

/** 把预设落成真实 sections（文案已翻译，id 已生成，值过一遍 schema 校验）。 */
export function buildPresetSections(
  preset: PagePreset,
  t: PresetTranslateFn,
): SiteSection[] {
  return preset.sections.map((spec) => buildPresetSection(spec, t));
}

/** 起步模板引用的页面版式（目前只有首页）。 */
export function findStarterPagePreset(key: string): PagePreset | undefined {
  if (key === HOME_STARTER_PRESET.key) return HOME_STARTER_PRESET;
  return undefined;
}
