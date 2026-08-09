/**
 * 「这个菜单被谁用着」——菜单 key → 引用它的位置文案（「页头」「页脚 · 链接列 2」）。
 *
 * 菜单是**共享**数据：页脚第 2 列和页头可以指着同一个 key。租户在页头里删掉一条链接，
 * 页脚那一列会跟着变——这件事必须在他动手之前就写在旁边，否则「共享」只会以「我明明
 * 只改了页头，页脚怎么也变了」的形式被发现。
 *
 * 认菜单靠 **schema 里 `type: "menu"` 的设置项**，不是硬编码 `header.menu` 那两处：
 * 以后哪个段再引一个菜单，这里自动跟上，忘了改的后果恰好是最难查的那种——提示少了
 * 一行，看起来一切正常。
 */

import {
  getBlockDefinition,
  getSectionDefinition,
  isInputSetting,
  type SettingDef,
  type SettingValues,
  type SiteSection,
} from "../../shared/section-schema.js";

import { sectionTypeLabel } from "./section-type-label.js";

export type SiteMenuUsage = Record<string, string[]>;

export function siteMenuUsage(
  sections: readonly SiteSection[],
  t: (key: string) => string,
): SiteMenuUsage {
  const usage: SiteMenuUsage = {};

  const collect = (
    defs: readonly SettingDef[],
    values: SettingValues,
    where: string,
  ): void => {
    for (const def of defs) {
      if (!isInputSetting(def) || def.type !== "menu") continue;
      const key = values[def.id];
      if (typeof key !== "string" || key === "") continue;
      (usage[key] ??= []).push(where);
    }
  };

  for (const section of sections) {
    const def = getSectionDefinition(section.type);
    if (!def) continue;
    const sectionLabel = sectionTypeLabel(t, section.type);
    collect(def.settings, section.settings, sectionLabel);

    /*
     * 同类 block 按出现次序编号（「链接列 1 / 2 / 3」）：页脚的列除了序号没有别的
     * 名字能指认——列标题可以留空，留空时正是靠菜单名顶上，拿它当位置说明会绕回去。
     */
    const ordinals = new Map<string, number>();
    for (const block of section.blocks) {
      const blockDef = getBlockDefinition(section.type, block.type);
      if (!blockDef) continue;
      const ordinal = (ordinals.get(block.type) ?? 0) + 1;
      ordinals.set(block.type, ordinal);
      collect(
        blockDef.settings,
        block.settings,
        `${sectionLabel} · ${t(blockDef.label)} ${ordinal}`,
      );
    }
  }

  return usage;
}
