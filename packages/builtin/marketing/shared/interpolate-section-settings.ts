/**
 * 按段的 schema 把 settings 里的文案 / 链接过一遍 `{token}` 插值。
 *
 * **插值收口在聚合层**（`renderSectionHtml` / `SiteSections`），不在各段的渲染器里：
 * 以前想支持占位符的段要自己 import `interpolateSiteText` / `interpolateSiteHref`、
 * 自己拼一张 values、自己记得每个字段都过一遍——结果是页脚支持、events 首屏支持，
 * 而 hero / band / prose / page-header 与所有贡献段一个 token 都不认，租户在区块标题里
 * 写 `{site}` 前台原样吐花括号。收口之后渲染器读到的 `settings` 已经是替换好的，
 * 新段**什么都不用做**就支持。
 *
 * 该替哪些字段由 `SettingDef.type` 决定，不靠字段名猜：
 *
 * - `text` / `textarea` / `richtext` / `list` → `interpolateSiteText`
 * - `link` → `interpolateSiteHref`（顺带收掉空路径段，见 site-interpolation）
 * - 其余（颜色、开关、数字、`select` 的枚举值、`nav_items`）**一律不碰**
 *
 * `nav_items` 是刻意排除的：导航条目在 `site-nav.ts` 展开时已经过同一张 values，
 * 在这里再过一遍等于替两次，条目里 `{}` 的转义规则也会跟着含糊。
 *
 * 没有 token 要替时原样返回同一个对象引用——绝大多数段一个花括号都没写，
 * 不该为此每次渲染都复制一份 settings。
 */

import {
  getSectionDefinition,
  isInputSetting,
  type SettingDef,
  type SettingValues,
  type SiteSection,
} from "./section-schema.js";
import {
  interpolateSiteHref,
  interpolateSiteText,
} from "./site-interpolation.js";

/** 走文本插值的设置类型。`link` 另走 href 那一支。 */
const TEXT_SETTING_TYPES = new Set(["text", "textarea", "richtext", "list"]);

function interpolateValues(
  defs: readonly SettingDef[],
  values: SettingValues,
  tokens: Record<string, string>,
): SettingValues {
  let out: SettingValues | null = null;
  for (const def of defs) {
    if (!isInputSetting(def)) continue;
    const raw = values[def.id];
    // `{` 都没有的值占绝大多数，先挡一道；多语言表在渲染路径上已被压成字符串
    if (typeof raw !== "string" || !raw.includes("{")) continue;
    const next =
      def.type === "link"
        ? interpolateSiteHref(raw, tokens)
        : TEXT_SETTING_TYPES.has(def.type)
          ? interpolateSiteText(raw, tokens)
          : raw;
    if (next === raw) continue;
    out ??= { ...values };
    out[def.id] = next;
  }
  return out ?? values;
}

/**
 * 一段（含它的 blocks）插值后的副本。
 *
 * 容器 block 里的子段**不在这里**处理：它们各自会再走一遍 `renderSectionHtml`
 * （SSR）/ `SiteSections`（预览），在那里按自己的 schema 插值。
 *
 * 认不出的段（模块停用后的 `unsupported`）原样返回：没有 schema 就无从判断哪个字段
 * 是文案，猜着替等于按字段名猜类型，正是这套 schema 要消灭的东西。
 */
export function interpolateSectionSettings(
  section: SiteSection,
  tokens: Record<string, string>,
): SiteSection {
  if (Object.keys(tokens).length === 0) return section;
  const definition = getSectionDefinition(section.type);
  if (!definition) return section;

  const settings = interpolateValues(definition.settings, section.settings, tokens);

  let blocks = section.blocks;
  if (blocks.length > 0 && definition.blocks) {
    let nextBlocks: typeof blocks | null = null;
    for (const [index, block] of blocks.entries()) {
      const blockDef = definition.blocks.find((d) => d.type === block.type);
      if (!blockDef) continue;
      const blockSettings = interpolateValues(
        blockDef.settings,
        block.settings,
        tokens,
      );
      if (blockSettings === block.settings) continue;
      nextBlocks ??= [...blocks];
      nextBlocks[index] = { ...block, settings: blockSettings };
    }
    blocks = nextBlocks ?? blocks;
  }

  if (settings === section.settings && blocks === section.blocks) return section;
  return { ...section, settings, blocks };
}
