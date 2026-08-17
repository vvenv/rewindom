import { describe, expect, it } from "vitest";

import {
  detectOriginLocale,
  hasLocaleText,
  mergeLocalizedMaps,
  resolveEventLocaleText,
} from "./locale.js";

describe("resolveEventLocaleText", () => {
  const map = { en: "OpenAI ships GPT-6", "zh-CN": "OpenAI 发布 GPT-6" };

  it("命中当前语言", () => {
    expect(resolveEventLocaleText(map, "zh-CN")).toBe("OpenAI 发布 GPT-6");
    expect(resolveEventLocaleText(map, "en")).toBe("OpenAI ships GPT-6");
  });

  it("缺当前语言时回落到 zh-CN，再回落 en", () => {
    expect(resolveEventLocaleText({ en: "only english" }, "zh-CN")).toBe(
      "only english",
    );
    expect(resolveEventLocaleText({ "zh-CN": "只有中文" }, "en")).toBe("只有中文");
  });

  it("空串不算译文，继续回落", () => {
    expect(resolveEventLocaleText({ "zh-CN": "  ", en: "fallback" }, "zh-CN")).toBe(
      "fallback",
    );
  });

  it("纯字符串按原样返回（尚未翻译的旧行）", () => {
    expect(resolveEventLocaleText("plain title", "zh-CN")).toBe("plain title");
  });

  it("非法值走 fallback", () => {
    expect(resolveEventLocaleText(null, "zh-CN", "兜底")).toBe("兜底");
    expect(resolveEventLocaleText({ a: 1 }, "zh-CN", "兜底")).toBe("兜底");
    expect(resolveEventLocaleText({}, "zh-CN", "兜底")).toBe("兜底");
  });
});

describe("hasLocaleText", () => {
  it("只有真有译文才为 true——回落不能谎称是本地内容", () => {
    expect(hasLocaleText({ "zh-CN": "有" }, "zh-CN")).toBe(true);
    expect(hasLocaleText({ en: "only en" }, "zh-CN")).toBe(false);
    expect(hasLocaleText({ "zh-CN": "   " }, "zh-CN")).toBe(false);
    expect(hasLocaleText("plain", "zh-CN")).toBe(false);
  });
});

describe("detectOriginLocale", () => {
  it("含汉字判为中文", () => {
    expect(detectOriginLocale("OpenAI 发布新模型")).toBe("zh-CN");
  });

  it("纯拉丁判为英文", () => {
    expect(detectOriginLocale("OpenAI ships GPT-6")).toBe("en");
  });

  it("数字与标点不影响判断", () => {
    expect(detectOriginLocale("GPT-6: $7B, 100% faster")).toBe("en");
  });
});

describe("mergeLocalizedMaps", () => {
  it("后面的覆盖前面的", () => {
    expect(mergeLocalizedMaps({ en: "old" }, { en: "new" })).toEqual({ en: "new" });
  });

  it("丢掉空串，不让 {\"en\": \"\"} 落库", () => {
    expect(mergeLocalizedMaps({ en: "keep", "zh-CN": "  " })).toEqual({
      en: "keep",
    });
  });

  it("忽略 null / undefined", () => {
    expect(mergeLocalizedMaps(null, { en: "a" }, undefined)).toEqual({ en: "a" });
  });
});
