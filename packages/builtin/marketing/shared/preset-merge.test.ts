import { describe, expect, it } from "vitest";

import {
  buildPresetSections,
  DOC_TEMPLATE_PRESETS,
  HOME_STARTER_PRESET,
} from "./page-presets.js";
import { mergeSectionsWithPreset } from "./preset-merge.js";
import { createSection } from "./section-schema.js";

import type { PresetTranslateFn } from "./page-presets.types.js";

const t: PresetTranslateFn = (key) => `t:${key}`;

describe("mergeSectionsWithPreset", () => {
  it("匹配到的段保留租户内容，预设新增的段补建", () => {
    // 旧版式只有 hero + prose；最新预设是 hero + prose + band
    const hero = createSection("hero");
    hero.settings.headline = "我的自定义标题";
    const prose = createSection("prose");
    prose.settings.body_md = "租户写的正文";

    const merged = mergeSectionsWithPreset([hero, prose], HOME_STARTER_PRESET, t);

    expect(merged.map((section) => section.type)).toEqual([
      "hero",
      "prose",
      "band",
    ]);
    expect(merged[0]?.id).toBe(hero.id);
    expect(merged[0]?.settings.headline).toBe("我的自定义标题");
    expect(merged[1]?.settings.body_md).toBe("租户写的正文");
    // 新建的 band 用最新预设的文案（已翻译）
    expect(merged[2]?.settings.headline).toBe("t:preset.home.cta.headline");
    expect(merged[2]?.settings.anchor).toBe("contact");
  });

  it("段顺序对齐到最新预设，内容不动", () => {
    const [hero, prose, band] = buildPresetSections(HOME_STARTER_PRESET, t);
    band!.settings.headline = "租户改过的 CTA";

    const merged = mergeSectionsWithPreset(
      [band!, hero!, prose!],
      HOME_STARTER_PRESET,
      t,
    );

    expect(merged.map((section) => section.type)).toEqual([
      "hero",
      "prose",
      "band",
    ]);
    expect(merged[2]?.id).toBe(band!.id);
    expect(merged[2]?.settings.headline).toBe("租户改过的 CTA");
  });

  it("租户自加的段按原顺序追加在末尾，不丢", () => {
    const [hero, prose, band] = buildPresetSections(HOME_STARTER_PRESET, t);
    const extraProse = createSection("prose");
    extraProse.settings.body_md = "租户自加的第二段正文";
    const extraBand = createSection("band");
    extraBand.settings.headline = "租户自加的通栏";

    const merged = mergeSectionsWithPreset(
      [hero!, prose!, extraProse, band!, extraBand],
      HOME_STARTER_PRESET,
      t,
    );

    // 前三段按预设匹配（prose 取第一个未消费的同类段），其余追加在后
    expect(merged.map((section) => section.id)).toEqual([
      hero!.id,
      prose!.id,
      band!.id,
      extraProse.id,
      extraBand.id,
    ]);
    expect(merged[3]?.settings.body_md).toBe("租户自加的第二段正文");
    expect(merged[4]?.settings.headline).toBe("租户自加的通栏");
  });

  it("空页面 = 整页按最新预设新建", () => {
    const merged = mergeSectionsWithPreset([], HOME_STARTER_PRESET, t);
    const fresh = buildPresetSections(HOME_STARTER_PRESET, t);

    expect(merged.map((section) => section.type)).toEqual(
      fresh.map((section) => section.type),
    );
    expect(merged[0]?.settings.headline).toBe("t:preset.home.hero.headline");
  });

  it("容器段递归：缺的列补建，已有列与列内子段保留", () => {
    // 现有 doc_article 只有两列（旧版式没有右侧章节导航）
    const [group] = buildPresetSections(DOC_TEMPLATE_PRESETS.doc_article, t);
    const existingGroup = {
      ...group!,
      blocks: group!.blocks.slice(0, 2),
    };
    const navSection = existingGroup.blocks[0]!.sections![0]!;
    navSection.settings.show_category = false;

    const merged = mergeSectionsWithPreset(
      [existingGroup],
      DOC_TEMPLATE_PRESETS.doc_article,
      t,
    );

    expect(merged).toHaveLength(1);
    const mergedGroup = merged[0]!;
    expect(mergedGroup.id).toBe(existingGroup.id);
    expect(mergedGroup.blocks).toHaveLength(3);
    // 前两列是租户原有的列（含子段的用户配置）
    expect(mergedGroup.blocks[0]?.id).toBe(existingGroup.blocks[0]!.id);
    expect(mergedGroup.blocks[0]?.sections?.[0]?.settings.show_category).toBe(
      false,
    );
    expect(mergedGroup.blocks[1]?.sections?.[0]?.type).toBe("doc-article");
    // 第三列按最新预设补建
    expect(mergedGroup.blocks[2]?.sections?.[0]?.type).toBe("doc-toc");
  });

  it("列内租户自加的子段保留，缺的子段补建", () => {
    const [group] = buildPresetSections(DOC_TEMPLATE_PRESETS.doc_article, t);
    // 第一列：删掉 doc-nav，换成租户自加的 prose
    const firstColumn = group!.blocks[0]!;
    const customProse = createSection("prose");
    customProse.settings.body_md = "列里的自定义内容";
    firstColumn.sections = [customProse];

    const merged = mergeSectionsWithPreset(
      [group!],
      DOC_TEMPLATE_PRESETS.doc_article,
      t,
    );

    const mergedFirst = merged[0]!.blocks[0]!;
    // doc-nav 按预设补回，自加的 prose 追加在后
    expect(mergedFirst.sections?.map((section) => section.type)).toEqual([
      "doc-nav",
      "prose",
    ]);
    expect(mergedFirst.sections?.[1]?.settings.body_md).toBe("列里的自定义内容");
  });
});
