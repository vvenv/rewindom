import { describe, expect, it } from "vitest";

import {
  NEWSLETTER_CONFIRM_TEMPLATE_PRESET,
  NEWSLETTER_SUBSCRIBE_PATH,
  NEWSLETTER_SUBSCRIBE_TEMPLATE_PRESET,
  NEWSLETTER_SUBSCRIBE_TEMPLATE_SLUG,
  NEWSLETTER_CONFIRM_TEMPLATE_SLUG,
  NEWSLETTER_UNSUBSCRIBE_TEMPLATE_PRESET,
  NEWSLETTER_UNSUBSCRIBE_TEMPLATE_SLUG,
} from "./newsletter-page-templates.js";
import { NEWSLETTER_CONFIRM_SECTION_TYPE } from "./sections/confirm/definition.js";
import { NEWSLETTER_SUBSCRIBE_SECTION_TYPE } from "./sections/subscribe/definition.js";
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
      NEWSLETTER_SUBSCRIBE_TEMPLATE_PRESET,
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

  it("三张页的 slug 互不相同——kind 决定地址，撞了就互相顶掉", () => {
    const slugs = [
      NEWSLETTER_SUBSCRIBE_TEMPLATE_SLUG,
      NEWSLETTER_CONFIRM_TEMPLATE_SLUG,
      NEWSLETTER_UNSUBSCRIBE_TEMPLATE_SLUG,
    ];
    expect(new Set(slugs).size).toBe(3);
  });

  it("订阅页的必备段就是订阅段本身", () => {
    expect(NEWSLETTER_SUBSCRIBE_TEMPLATE_PRESET.sections[0]!.type).toBe(
      NEWSLETTER_SUBSCRIBE_SECTION_TYPE,
    );
  });

  it("订阅页地址是 /subscribe，不塞进 /newsletter/* 下", () => {
    /*
     * 确认页 / 退订页是从邮件点进来的一次性事务页，藏深一点无所谓；
     * 订阅页是要贴在首屏按钮、页脚、社交简介里的地址，短的那个才用得起来。
     */
    expect(NEWSLETTER_SUBSCRIBE_PATH).toBe("/subscribe");
  });

  it("订阅段不钉 page_kinds——它既是模板页的必备段，也能摆到别的页面上", async () => {
    const { newsletterSubscribeSection } =
      await import("./sections/subscribe/definition.js");
    expect(newsletterSubscribeSection.page_kinds).toBeUndefined();
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

describe("抬头默认值", () => {
  it.each([
    [
      "./sections/subscribe/definition.js",
      "newsletterSubscribeSection",
      NEWSLETTER_SUBSCRIBE_TEMPLATE_PRESET,
    ],
    [
      "./sections/confirm/definition.js",
      "newsletterConfirmSection",
      NEWSLETTER_CONFIRM_TEMPLATE_PRESET,
    ],
    [
      "./sections/unsubscribe/definition.js",
      "newsletterUnsubscribeSection",
      NEWSLETTER_UNSUBSCRIBE_TEMPLATE_PRESET,
    ],
  ])(
    "%s 的 heading / subheading 与预设 text 同一条 key",
    async (path, exported, preset) => {
      /*
       * 两处必须是同一条 key，否则：段单独拖到别的页面上时没有抬头（`headingSettings()`
       * 不给 default 就是空的）；跨语言复制时 `stockOrSourceCopy` 找不到字段专属的库存
       * 表；存量里空掉的槽位也不会被 `reconcileStockLocalizedText` 按库存回填——
       * 而同段的按钮文案 / 提示语都有 default，坏起来只坏抬头这一对，很难看出来。
       */
      const mod = (await import(path)) as Record<
        string,
        { settings: { id?: string; default?: unknown }[] }
      >;
      const settings = mod[exported]!.settings;
      const byId = (id: string) => settings.find((def) => def.id === id);
      expect(byId("heading")?.default).toBe(preset.sections[0]!.text!.heading);
      expect(byId("subheading")?.default).toBe(
        preset.sections[0]!.text!.subheading,
      );
    },
  );

  it("存量里空掉的抬头槽位，解析时按库存文案回填", async () => {
    /*
     * 交付第一版时客户端漏了 `registerLocaleCatalog("newsletter", …)`（见
     * `client/i18n.ts`），那之前建出来的订阅页把抬头落成了单语字符串，之后再被
     * 写进另一语的槽位，结果是「本页语言那一格是空的、另一语才有字」。
     */
    await import("../server/preset-i18n.js");
    const { newsletterSubscribeSection } =
      await import("./sections/subscribe/definition.js");
    const { parseSettingValues } =
      await import("@rewindom/builtin/marketing/shared/section-schema.js");
    const parsed = parseSettingValues(newsletterSubscribeSection.settings, {
      heading: { __i18n: { en: "Subscribe", "zh-CN": "" } },
      submit_label: "订阅",
    });
    expect(parsed.heading).toEqual({
      __i18n: { en: "Subscribe", "zh-CN": "订阅更新" },
    });
  });
});
