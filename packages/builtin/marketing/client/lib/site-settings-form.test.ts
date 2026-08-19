import { describe, expect, it } from "vitest";

import { analyticsReady, pinToLocale, primaryText, sameLocalizedText } from "./site-settings-form.js";

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

describe("analyticsReady", () => {
  it("Cloudflare / Plausible 没有站点标识时不能存", () => {
    expect(
      analyticsReady({
        provider: "cloudflare",
        script_url: "",
        site_id: "",
      }),
    ).toBe(false);
    expect(
      analyticsReady({
        provider: "cloudflare",
        script_url: "",
        site_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
    ).toBe(true);
  });

  it("custom 只认 https 脚本地址", () => {
    expect(
      analyticsReady({
        provider: "custom",
        script_url: "javascript:alert(1)",
        site_id: "",
      }),
    ).toBe(false);
    expect(
      analyticsReady({
        provider: "custom",
        script_url: "https://stats.example.com/s.js",
        site_id: "",
      }),
    ).toBe(true);
  });
});
