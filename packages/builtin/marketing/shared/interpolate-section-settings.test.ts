import { describe, expect, it } from "vitest";

import { interpolateSectionSettings } from "./interpolate-section-settings.js";
import {
  createSection,
  type SettingValues,
  type SiteSection,
} from "./section-schema.js";

const TOKENS = {
  site: "Yestino",
  tagline: "把散落的线索连成时间线",
  year: "2026",
};

function hero(settings: SettingValues): SiteSection {
  const base = createSection("hero");
  return { ...base, settings: { ...base.settings, ...settings } };
}

describe("interpolateSectionSettings", () => {
  it("文案类设置按 schema 替换", () => {
    const out = interpolateSectionSettings(
      hero({ headline: "{site} · {tagline}", subhead: "© {year}" }),
      TOKENS,
    );
    expect(out.settings.headline).toBe("Yestino · 把散落的线索连成时间线");
    expect(out.settings.subhead).toBe("© 2026");
  });

  it("link 类走 href 那一支：空段收掉，不留下 //", () => {
    const out = interpolateSectionSettings(
      hero({ primary_href: "/topics/{topic_slug}/feed.xml" }),
      { ...TOKENS, topic_slug: "" },
    );
    expect(out.settings.primary_href).toBe("/topics/feed.xml");
  });

  it("未识别的 {foo} 原样留下", () => {
    const out = interpolateSectionSettings(hero({ headline: "{foo}" }), TOKENS);
    expect(out.settings.headline).toBe("{foo}");
  });

  it("非文案设置不碰（颜色里的花括号不是占位符）", () => {
    const section = hero({ bg_color: "#fff", show_glow: true });
    const out = interpolateSectionSettings(section, TOKENS);
    expect(out.settings.bg_color).toBe("#fff");
    expect(out.settings.show_glow).toBe(true);
  });

  it("没有 token 要替时原样返回同一个对象（不白复制一份 settings）", () => {
    const section = hero({ headline: "固定标题" });
    expect(interpolateSectionSettings(section, TOKENS)).toBe(section);
    expect(interpolateSectionSettings(section, {})).toBe(section);
  });

  it("block 的文案同样替", () => {
    const base = createSection("hero");
    const section: SiteSection = {
      ...base,
      blocks: [
        { id: "b1", type: "stat", settings: { term: "{site}", detail: "{year}" } },
      ],
    };
    const out = interpolateSectionSettings(section, TOKENS);
    expect(out.blocks[0]!.settings.term).toBe("Yestino");
    expect(out.blocks[0]!.settings.detail).toBe("2026");
    // 段本身没动过就不该被复制
    expect(out.settings).toBe(section.settings);
  });

  it("认不出的段原样返回——没有 schema 就无从判断哪个字段是文案", () => {
    const section: SiteSection = {
      id: "x",
      type: "unsupported",
      settings: { headline: "{site}" },
      blocks: [],
    };
    expect(interpolateSectionSettings(section, TOKENS)).toBe(section);
  });
});
