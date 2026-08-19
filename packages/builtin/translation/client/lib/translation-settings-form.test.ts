import { describe, expect, it } from "vitest";

import {
  buildTranslationPayload,
  engineNeedsEndpoint,
  engineNeedsKey,
  INITIAL_TRANSLATION_FORM,
  parseKeepTerms,
  statusToForm,
  validateTranslationForm,
  type TranslationFormValues,
} from "./translation-settings-form.js";

import type { TranslationStatus } from "../../shared/translation.js";

const t = (key: string): string => key;

function form(overrides: Partial<TranslationFormValues> = {}) {
  return { ...INITIAL_TRANSLATION_FORM, ...overrides };
}

describe("parseKeepTerms", () => {
  it("按行拆、去空、去重", () => {
    expect(parseKeepTerms(" Apple TV \n\n飞书\nApple TV\n")).toEqual([
      "Apple TV",
      "飞书",
    ]);
  });
});

describe("buildTranslationPayload", () => {
  it("没输入 key 时不带 api_key —— 带空串是「清除」的意思", () => {
    const payload = buildTranslationPayload(form({ engine: "deepl" }));
    expect("api_key" in payload).toBe(false);
  });

  it("输入了 key 就带上", () => {
    const payload = buildTranslationPayload(
      form({ engine: "deepl", api_key: " abc " }),
    );
    expect(payload.api_key).toBe("abc");
  });

  it("空端点归一成 null", () => {
    expect(buildTranslationPayload(form({ endpoint: "  " })).endpoint).toBeNull();
  });
});

describe("statusToForm", () => {
  it("不把 key 掩码填进输入框", () => {
    const status = {
      enabled: true,
      engine: "deepl",
      endpoint: null,
      proxy: true,
      targets: ["zh-CN"],
      keep_terms: ["OpenAI"],
      api_key_hint: "…abcd",
      has_api_key: true,
    } satisfies TranslationStatus;
    expect(statusToForm(status).api_key).toBe("");
    expect(statusToForm(status).keep_terms).toBe("OpenAI");
  });
});

describe("engine 能力判定", () => {
  it("带 key 的引擎要 key，免费引擎不要", () => {
    expect(engineNeedsKey("deepl")).toBe(true);
    expect(engineNeedsKey("llm")).toBe(true);
    expect(engineNeedsKey("browser")).toBe(false);
    expect(engineNeedsKey("mymemory")).toBe(false);
  });

  it("自建实例类引擎要端点", () => {
    expect(engineNeedsEndpoint("libretranslate")).toBe(true);
    expect(engineNeedsEndpoint("custom")).toBe(true);
    expect(engineNeedsEndpoint("browser")).toBe(false);
  });
});

describe("validateTranslationForm", () => {
  it("没启用时不校验", () => {
    expect(validateTranslationForm(form({ engine: "custom" }), t)).toBe("");
  });

  it("自建实例缺端点要拦", () => {
    expect(
      validateTranslationForm(form({ enabled: true, engine: "libretranslate" }), t),
    ).toBe("settings.errors.endpointRequired");
  });

  it("非 http(s) 端点要拦 —— enhance 会直接 fetch 它", () => {
    expect(
      validateTranslationForm(
        form({ enabled: true, engine: "custom", endpoint: "javascript:alert(1)" }),
        t,
      ),
    ).toBe("settings.errors.endpointInvalid");
  });

  it("浏览器内置引擎无需任何配置", () => {
    expect(validateTranslationForm(form({ enabled: true }), t)).toBe("");
  });
});
