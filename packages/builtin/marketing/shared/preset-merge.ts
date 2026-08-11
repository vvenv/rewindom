/**
 * 「重设为最新版式」的合并算法。
 *
 * 目标：把页面结构补齐 / 对齐到最新预设，同时**尽量保留**租户已填的内容与配置。
 * 所以这不是「整页替换」——那等于把租户的文案全部清掉；也不是「什么都不动」——
 * 那预设升级就永远到不了存量页面。
 *
 * 语义（段与 block 同一套规则，容器列里的子段递归）：
 *
 * - 以**最新预设的顺序**为骨架，每一项按 type 匹配现有内容中第一个未消费的同类项；
 * - 匹配到 → 保留现有那一项（id / settings / 文案原样），预设自带的默认值**不**盖
 *   上去——租户改过什么无从区分，宁可少动；
 * - 预设新增而页面没有的 → 按预设新建（文案用页面语言的 `t()` 落成实际值）；
 * - 页面里预设没有的（租户自加的段 / block）→ 按原相对顺序追加在末尾，不丢。
 *
 * 新出现的 setting 补默认值、旧形状升级，都不在这里做——结果会再过一遍
 * `parsePageSections`，那条写路径本来就负责这两件事。
 */

import {
  buildPresetBlock,
  buildPresetSection,
} from "./page-presets.js";

import type {
  PagePreset,
  PresetBlock,
  PresetSection,
  PresetTranslateFn,
} from "./page-presets.types.js";
import type { SiteBlock, SiteSection } from "./section-schema.js";

/** 从池子里取出第一个未消费的同类项（取走后置 null，保持其余项的相对顺序）。 */
function takeByType<T extends { type: string }>(
  pool: (T | null)[],
  type: string,
): T | null {
  for (let i = 0; i < pool.length; i++) {
    const item = pool[i];
    if (item && item.type === type) {
      pool[i] = null;
      return item;
    }
  }
  return null;
}

function mergeBlockList(
  sectionType: string,
  current: SiteBlock[],
  specs: PresetBlock[],
  t: PresetTranslateFn,
): SiteBlock[] {
  const pool: (SiteBlock | null)[] = [...current];
  const out: SiteBlock[] = [];
  for (const spec of specs) {
    const matched = takeByType(pool, spec.type);
    out.push(
      matched
        ? mergeBlock(sectionType, matched, spec, t)
        : buildPresetBlock(sectionType, spec, t),
    );
  }
  for (const leftover of pool) {
    if (leftover) out.push(leftover);
  }
  return out;
}

function mergeBlock(
  sectionType: string,
  existing: SiteBlock,
  spec: PresetBlock,
  t: PresetTranslateFn,
): SiteBlock {
  // 容器列：列本身保留（sticky / 分割线等配置是租户的），列里的子段递归合并
  if (!spec.sections) return existing;
  return {
    ...existing,
    sections: mergeSectionList(existing.sections ?? [], spec.sections, t),
  };
}

function mergeSection(
  existing: SiteSection,
  spec: PresetSection,
  t: PresetTranslateFn,
): SiteSection {
  // 预设没有声明 blocks 的段（靠 definition 默认 block），现有 blocks 是租户的状态，不动
  if (!spec.blocks) return existing;
  return {
    ...existing,
    blocks: mergeBlockList(existing.type, existing.blocks, spec.blocks, t),
  };
}

function mergeSectionList(
  current: SiteSection[],
  specs: PresetSection[],
  t: PresetTranslateFn,
): SiteSection[] {
  const pool: (SiteSection | null)[] = [...current];
  const out: SiteSection[] = [];
  for (const spec of specs) {
    const matched = takeByType(pool, spec.type);
    out.push(matched ? mergeSection(matched, spec, t) : buildPresetSection(spec, t));
  }
  for (const leftover of pool) {
    if (leftover) out.push(leftover);
  }
  return out;
}

/** 把页面现有 sections 合并到最新预设结构上（见文件头的语义说明）。 */
export function mergeSectionsWithPreset(
  current: SiteSection[],
  preset: PagePreset,
  t: PresetTranslateFn,
): SiteSection[] {
  return mergeSectionList(current, preset.sections, t);
}
