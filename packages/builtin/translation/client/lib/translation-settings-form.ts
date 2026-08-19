/**
 * 设置表单的纯逻辑（`frontend-page-structure`：Page / Hook / Lib / Component 四层）。
 *
 * 术语表在表单里是**一行一条的文本域**，落到 API 是字符串数组——这个转换放在
 * lib 层，组件只管渲染。
 */

import {
  DEFAULT_TRANSLATION_ENGINE,
  engineNeedsProxy,
  isTranslationEngine,
  type TranslationEngine,
  type TranslationStatus,
  type TranslationWriteBody,
} from "../../shared/translation.js";

export interface TranslationFormValues {
  enabled: boolean;
  engine: TranslationEngine;
  endpoint: string;
  /** 一行一条。 */
  keep_terms: string;
}

export const INITIAL_TRANSLATION_FORM: TranslationFormValues = {
  enabled: false,
  engine: DEFAULT_TRANSLATION_ENGINE,
  endpoint: "",
  keep_terms: "",
};

export function statusToForm(status: TranslationStatus): TranslationFormValues {
  return {
    enabled: status.enabled,
    engine: status.engine,
    endpoint: status.endpoint ?? "",
    keep_terms: status.keep_terms.join("\n"),
  };
}

export function parseKeepTerms(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ];
}

export function buildTranslationPayload(
  form: TranslationFormValues,
): TranslationWriteBody {
  return {
    enabled: form.enabled,
    engine: form.engine,
    endpoint: form.endpoint.trim() || null,
    keep_terms: parseKeepTerms(form.keep_terms),
  };
}

/**
 * 密钥 Sheet 只有这一项：空串就是清除已存密钥。
 * 与 `PUT /settings/translation` 契约一致（省略 = 不改；空串 = 清除）。
 */
export function buildTranslationKeyPayload(
  apiKey: string,
): TranslationWriteBody {
  return { api_key: apiKey.trim() };
}

/** 引擎是否需要 API Key（工作台展示密钥状态行 + Sheet）。 */
export function engineNeedsKey(engine: TranslationEngine): boolean {
  return engineNeedsProxy(engine);
}

/** 引擎是否需要自定义端点（LibreTranslate 自建实例、自定义中转）。 */
export function engineNeedsEndpoint(engine: TranslationEngine): boolean {
  return engine === "libretranslate" || engine === "custom";
}

export function validateTranslationForm(
  form: TranslationFormValues,
  t: (key: string) => string,
): string {
  if (!form.enabled) return "";
  if (!isTranslationEngine(form.engine)) return t("settings.errors.engine");
  if (engineNeedsEndpoint(form.engine) && !form.endpoint.trim()) {
    return t("settings.errors.endpointRequired");
  }
  if (form.endpoint.trim()) {
    try {
      const url = new URL(form.endpoint.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return t("settings.errors.endpointInvalid");
      }
    } catch {
      return t("settings.errors.endpointInvalid");
    }
  }
  return "";
}
