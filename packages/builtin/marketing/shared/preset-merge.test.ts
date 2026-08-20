import { describe, expect, it } from "vitest";

import { buildPresetSections } from "./page-presets.js";
import { mergeSectionsWithPreset } from "./preset-merge.js";
import { createSection } from "./section-schema.js";

import type { PagePreset, PresetTranslateFn } from "./page-presets.types.js";

const t: PresetTranslateFn = (key) => `t:${key}`;

/** merge 算法用的三段夹具；不依赖内核空白首页。 */
const THREE_SECTION_PRESET: PagePreset = {
  key: "merge-fixture",
  label: "merge-fixture",
  kind: "home",
  slug: "home",
  titleKey: "x",
  descriptionKey: "x",
  sections: [
    {
      type: "hero",
      text: { headline: "fixture.hero.headline" },
      raw: { primary_href: "#contact" },
    },
    { type: "prose", text: { body_md: "fixture.prose.body" } },
    {
      type: "band",
      text: { headline: "fixture.cta.headline" },
      raw: { anchor: "contact" },
    },
  ],
};

/** 三列容器：测 merge 递归补列 / 补子段，不依赖贡献模块。 */
const GROUP_PRESET: PagePreset = {
  key: "group",
  label: "group",
  kind: "home",
  slug: "home",
  titleKey: "x",
  descriptionKey: "x",
  sections: [
    {
      type: "group",
      raw: {
        columns_layout: "2:8:2",
        column_gap: 40,
        align_items: "stretch",
      },
      blocks: [
        {
          type: "column",
          raw: { show_divider: true },
          sections: [{ type: "prose" }],
        },
        {
          type: "column",
          raw: { show_divider: true },
          sections: [{ type: "hero" }],
        },
        {
          type: "column",
          sections: [{ type: "band" }],
        },
      ],
    },
  ],
};

describe("mergeSectionsWithPreset", () => {
  it("匹配到的段保留租户内容，预设新增的段补建", () => {
    // 旧版式只有 hero + prose；最新预设是 hero + prose + band
    const hero = createSection("hero");
    hero.settings.headline = "我的自定义标题";
    const prose = createSection("prose");
    prose.settings.body_md = "租户写的正文";

    const merged = mergeSectionsWithPreset([hero, prose], THREE_SECTION_PRESET, t);

    expect(merged.map((section) => section.type)).toEqual([
      "hero",
      "prose",
      "band",
    ]);
    expect(merged[0]?.id).toBe(hero.id);
    expect(merged[0]?.settings.headline).toBe("我的自定义标题");
    expect(merged[1]?.settings.body_md).toBe("租户写的正文");
    expect(merged[2]?.settings.headline).toBe("t:fixture.cta.headline");
    expect(merged[2]?.settings.anchor).toBe("contact");
  });

  it("段顺序对齐到最新预设，内容不动", () => {
    const [hero, prose, band] = buildPresetSections(THREE_SECTION_PRESET, t);
    band!.settings.headline = "租户改过的 CTA";

    const merged = mergeSectionsWithPreset(
      [band!, hero!, prose!],
      THREE_SECTION_PRESET,
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
    const [hero, prose, band] = buildPresetSections(THREE_SECTION_PRESET, t);
    const extraProse = createSection("prose");
    extraProse.settings.body_md = "租户自加的第二段正文";
    const extraBand = createSection("band");
    extraBand.settings.headline = "租户自加的通栏";

    const merged = mergeSectionsWithPreset(
      [hero!, prose!, extraProse, band!, extraBand],
      THREE_SECTION_PRESET,
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
    const merged = mergeSectionsWithPreset([], THREE_SECTION_PRESET, t);
    const fresh = buildPresetSections(THREE_SECTION_PRESET, t);

    expect(merged.map((section) => section.type)).toEqual(
      fresh.map((section) => section.type),
    );
    expect(merged[0]?.settings.headline).toBe("t:fixture.hero.headline");
  });

  it("容器段递归：缺的列补建，已有列与列内子段保留", () => {
    const [group] = buildPresetSections(GROUP_PRESET, t);
    const existingGroup = {
      ...group!,
      blocks: group!.blocks.slice(0, 2),
    };
    const firstChild = existingGroup.blocks[0]!.sections![0]!;
    firstChild.settings.body_md = "租户改过的列";

    const merged = mergeSectionsWithPreset([existingGroup], GROUP_PRESET, t);

    expect(merged).toHaveLength(1);
    const mergedGroup = merged[0]!;
    expect(mergedGroup.id).toBe(existingGroup.id);
    expect(mergedGroup.blocks).toHaveLength(3);
    expect(mergedGroup.blocks[0]?.id).toBe(existingGroup.blocks[0]!.id);
    expect(mergedGroup.blocks[0]?.sections?.[0]?.settings.body_md).toBe(
      "租户改过的列",
    );
    expect(mergedGroup.blocks[1]?.sections?.[0]?.type).toBe("hero");
    expect(mergedGroup.blocks[2]?.sections?.[0]?.type).toBe("band");
  });

  it("列内租户自加的子段保留，缺的子段补建", () => {
    const [group] = buildPresetSections(GROUP_PRESET, t);
    const firstColumn = group!.blocks[0]!;
    const customHero = createSection("hero");
    customHero.settings.headline = "列里的自定义内容";
    firstColumn.sections = [customHero];

    const merged = mergeSectionsWithPreset([group!], GROUP_PRESET, t);

    const mergedFirst = merged[0]!.blocks[0]!;
    expect(mergedFirst.sections?.map((section) => section.type)).toEqual([
      "prose",
      "hero",
    ]);
    expect(mergedFirst.sections?.[1]?.settings.headline).toBe("列里的自定义内容");
  });
});
