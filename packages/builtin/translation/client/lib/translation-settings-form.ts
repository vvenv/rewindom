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
  /** 空串 = 不改动已存的 key；用户清空要显式点「清除」。 */
  api_key: string;
  /** 一行一条。 */
  keep_terms: string;
}

export const INITIAL_TRANSLATION_FORM: TranslationFormValues = {
  enabled: false,
  engine: DEFAULT_TRANSLATION_ENGINE,
  endpoint: "",
  api_key: "",
  keep_terms: "",
};

export function statusToForm(status: TranslationStatus): TranslationFormValues {
  return {
    enabled: status.enabled,
    engine: status.engine,
    endpoint: status.endpoint ?? "",
    api_key: "",
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
    // 没输入就不带这个字段：带空串是「清除已存 key」的意思
    ...(form.api_key.trim() ? { api_key: form.api_key.trim() } : {}),
    keep_terms: parseKeepTerms(form.keep_terms),
  };
}

/** 引擎是否需要在表单里出现「API Key」输入框。 */
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
