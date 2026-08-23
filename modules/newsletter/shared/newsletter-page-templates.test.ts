import { describe, expect, it } from "vitest";

import {
  NEWSLETTER_CONFIRM_TEMPLATE_PRESET,
  NEWSLETTER_CONFIRM_TEMPLATE_SLUG,
  NEWSLETTER_UNSUBSCRIBE_TEMPLATE_PRESET,
  NEWSLETTER_UNSUBSCRIBE_TEMPLATE_SLUG,
} from "./newsletter-page-templates.js";
import { NEWSLETTER_CONFIRM_SECTION_TYPE } from "./sections/confirm/definition.js";
import { NEWSLETTER_UNSUBSCRIBE_SECTION_TYPE } from "./sections/unsubscribe/definition.js";

describe("订阅页版式", () => {
  it.each([
    [
      NEWSLETTER_CONFIRM_TEMPLATE_PRESET,
      NEWSLETTER_CONFIRM_SECTION_TYPE,
      NEWSLETTER_CONFIRM_TEMPLATE_SLUG,
    ],
    [
      NEWSLETTER_UNSUBSCRIBE_TEMPLATE_PRESET,
      NEWSLETTER_UNSUBSCRIBE_SECTION_TYPE,
      NEWSLETTER_UNSUBSCRIBE_TEMPLATE_SLUG,
    ],
  ])("预设含且仅含那一个必备段", (preset, sectionType, slug) => {
    // 必备段是这张模板存在的理由本身：删掉它，读者手里的链接就全部点不动了
    expect(preset.sections).toHaveLength(1);
    expect(preset.sections[0]!.type).toBe(sectionType);
    expect(preset.slug).toBe(slug);
  });

  it("预设文案全是 ns:key，不是先 t() 过的单语", () => {
    /*
     * 库存文案的口径：预设只写 key，落成实际文案发生在创建 / 兜底渲染那一刻。
     * 先 t() 成中文的话，英文站建出来的页面会是中文的。
     */
    for (const preset of [
      NEWSLETTER_CONFIRM_TEMPLATE_PRESET,
      NEWSLETTER_UNSUBSCRIBE_TEMPLATE_PRESET,
    ]) {
      expect(preset.titleKey).toMatch(/^newsletter:/u);
      expect(preset.descriptionKey).toMatch(/^newsletter:/u);
      for (const value of Object.values(preset.sections[0]!.text ?? {})) {
        expect(String(value)).toMatch(/^newsletter:/u);
      }
    }
  });

  it("两张页的 slug 不同——kind 决定地址，撞了就互相顶掉", () => {
    expect(NEWSLETTER_CONFIRM_TEMPLATE_SLUG).not.toBe(
      NEWSLETTER_UNSUBSCRIBE_TEMPLATE_SLUG,
    );
  });
});

describe("订阅列表 key", () => {
  it("「本站全部」是一个真实的 key，不是空串", async () => {
    /*
     * 空串在下拉控件里等同「未选择」，而这里它是一个**有意义的选项**——
     * 多个内容源并存时，租户必须能明确选中它。
     */
    const { NEWSLETTER_ALL_LISTS } = await import("./newsletter.js");
    expect(NEWSLETTER_ALL_LISTS).toBe("newsletter.all");
    expect(NEWSLETTER_ALL_LISTS.length).toBeGreaterThan(0);
  });

  it("默认周期是每日", async () => {
    const { DEFAULT_DIGEST_CADENCE } = await import("./newsletter.js");
    expect(DEFAULT_DIGEST_CADENCE).toBe("daily");
  });
});
