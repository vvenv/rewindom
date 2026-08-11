import { describe, expect, it } from "vitest";

import { siteDraftIsDirty } from "./site.util.js";

/*
 * section 必须自带 `id`：解析时没有就现生成一个 uuid，两次调用生成的不一样，
 * 指纹自然对不上——真实数据里 id 是存下来的，所以这只是 fixture 的事。
 */
const header = [{ id: "h1", type: "header", settings: {}, blocks: [] }];
const footer = [{ id: "f1", type: "footer", settings: {}, blocks: [] }];

function record(partial: Partial<Parameters<typeof siteDraftIsDirty>[0]> = {}) {
  return {
    nav_json: header,
    footer_json: footer,
    nav_draft_json: header,
    footer_draft_json: footer,
    theme_settings: { primary_color: "#0369a1" },
    theme_settings_draft: { primary_color: "#0369a1" },
    ...partial,
  };
}

/**
 * 站点级草稿的脏标记覆盖**三样**：页头、页脚、主题。漏掉主题的话，改完配色状态点
 * 会报「线上已是最新」，租户照着绿点走人，改动永远停在草稿里。
 */
describe("siteDraftIsDirty", () => {
  it("三样都与线上一致时不脏", () => {
    expect(siteDraftIsDirty(record())).toBe(false);
  });

  // `sticky` 默认就是 true，要造出差异得关掉它——否则解析回来两边一模一样
  it("页头草稿变了就脏", () => {
    expect(
      siteDraftIsDirty(
        record({
          nav_draft_json: [
            {
              id: "h1",
              type: "header",
              settings: { sticky: false },
              blocks: [],
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("只改了主题也脏", () => {
    expect(
      siteDraftIsDirty(
        record({ theme_settings_draft: { primary_color: "#c026d3" } }),
      ),
    ).toBe(true);
  });

  /** 库里是自由 JSON：键序不同、多一个表单碰不到的字段，都不该算成待发布。 */
  it("主题按归一化后的值比，不受键序与额外字段影响", () => {
    expect(
      siteDraftIsDirty(
        record({
          theme_settings: { primary_color: "#0369a1", font_family: "serif" },
          theme_settings_draft: {
            font_family: "serif",
            primary_color: "#0369a1",
            legacy_field: "ignored",
          },
        }),
      ),
    ).toBe(false);
  });
});
