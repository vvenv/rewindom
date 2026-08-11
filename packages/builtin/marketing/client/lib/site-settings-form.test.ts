import { describe, expect, it } from "vitest";

import {
  parseSiteSettingsTab,
  pinToLocale,
  primaryText,
  sameLocalizedText,
  sameThemeSettings,
} from "./site-settings-form.js";

describe("parseSiteSettingsTab", () => {
  it("认识合法分区", () => {
    expect(parseSiteSettingsTab("redirects")).toBe("redirects");
  });

  /** URL 是用户能手改的，认不出来就回第一个分区，不该白屏。 */
  it("认不出来的一律回基本信息", () => {
    expect(parseSiteSettingsTab(null)).toBe("basics");
    expect(parseSiteSettingsTab("nope")).toBe("basics");
  });
});

describe("sameLocalizedText", () => {
  const locales = ["zh-CN", "en"] as const;

  it("纯字符串与 __i18n 存着同一份文案时算相同", () => {
    expect(
      sameLocalizedText(
        "示例站点",
        { __i18n: { "zh-CN": "示例站点" } },
        [...locales],
        "zh-CN",
      ),
    ).toBe(true);
  });

  it("任一语言的文案不同就算改过", () => {
    expect(
      sameLocalizedText(
        { __i18n: { "zh-CN": "示例站点", en: "Example" } },
        { __i18n: { "zh-CN": "示例站点" } },
        [...locales],
        "zh-CN",
      ),
    ).toBe(false);
  });
});

describe("pinToLocale", () => {
  it("把纯字符串钉在指定语言下", () => {
    expect(pinToLocale("示例站点", "zh-CN")).toEqual({
      __i18n: { "zh-CN": "示例站点" },
    });
  });

  /** 已经是 `__i18n` 的，语言已经写明了，再钉一次只会覆盖别的语言。 */
  it("已分语言的原样返回", () => {
    const value = { __i18n: { "zh-CN": "示例站点", en: "Example" } };
    expect(pinToLocale(value, "en")).toBe(value);
  });

  it("空串不钉——钉了就凭空造出一份空译文", () => {
    expect(pinToLocale("", "zh-CN")).toBe("");
  });
});

describe("sameThemeSettings", () => {
  it("没设过与设过又清空都算空", () => {
    expect(sameThemeSettings({}, { primary_color: null })).toBe(true);
  });

  it("键的顺序不影响比较", () => {
    expect(
      sameThemeSettings(
        { primary_color: "#111111", font_family: "serif" },
        { font_family: "serif", primary_color: "#111111" },
      ),
    ).toBe(true);
  });

  it("值不同就算改过", () => {
    expect(
      sameThemeSettings({ section_spacing: 16 }, { section_spacing: 24 }),
    ).toBe(false);
  });

  /** 表单碰不到的键不参与比较，否则服务端多回一个字段就永远「脏」着。 */
  it("忽略表单之外的字段", () => {
    expect(
      sameThemeSettings({ primary_color: "#111111" }, {
        primary_color: "#111111",
        radius: 8,
      } as never),
    ).toBe(true);
  });
});

describe("primaryText", () => {
  it("读主语言那一份并去掉首尾空白", () => {
    expect(
      primaryText(
        { __i18n: { "zh-CN": "  示例站点 ", en: "Example" } },
        "zh-CN",
      ),
    ).toBe("示例站点");
  });

  it("主语言没有内容时是空串", () => {
    expect(primaryText({ __i18n: { en: "Example" } }, "zh-CN")).toBe("");
  });
});
