/**
 * 内容翻译契约（跨端共用）。
 *
 * 定位是**访客侧的查看辅助**，不是产品资产：译文只活在浏览器里，不落库、不进
 * 索引、不参与 SEO。原文永远是真源，一键还原。这条口径决定了下面所有取舍——
 * 没有译文表、没有失效逻辑、没有重译任务。
 *
 * 引擎分两类，边界是**要不要 API key**：
 * - 无 key（`browser` / `libretranslate` / `mymemory`）→ 浏览器直连，服务端零参与
 * - 有 key（`deepl` / `google` / `llm` / `custom`）→ 必须走服务端薄代理，
 *   key 一旦下发到浏览器就等于公开
 */

import { APP_LOCALES } from "@rewindom/shared";

/** 租户设置里的持久化标识，改动会令存量配置失效。 */
export const TENANT_SETTING_KEY_TRANSLATION = "translation";

export const TRANSLATION_ENGINES = [
  /**
   * 浏览器内置翻译（Chrome 138+ 的 `Translator` API，本地 NMT 模型）。
   * 免费、无配额、无 key、离线、不外发访客正在读什么——默认就是它。
   */
  "browser",
  /** 自建或公共 LibreTranslate 实例，无 key 时浏览器直连。 */
  "libretranslate",
  /** MyMemory 免费端点。配额按访客 IP 分摊，纯客户端在这里反而占便宜。 */
  "mymemory",
  "deepl",
  "google",
  /** OpenAI 兼容端点，术语保护效果最好，也最贵。 */
  "llm",
  /** 自定义 HTTP 端点，请求/响应形状见 MODULE.md。 */
  "custom",
] as const;

export type TranslationEngine = (typeof TRANSLATION_ENGINES)[number];

export const DEFAULT_TRANSLATION_ENGINE: TranslationEngine = "browser";

/**
 * 需要 API key 的引擎。**唯一的判据**——在这张表里就必须走服务端代理，
 * 不在表里才允许把端点下发给浏览器直连。
 */
const KEYED_ENGINES = new Set<TranslationEngine>([
  "deepl",
  "google",
  "llm",
  "custom",
]);

export function engineNeedsProxy(engine: TranslationEngine): boolean {
  return KEYED_ENGINES.has(engine);
}

export function isTranslationEngine(value: unknown): value is TranslationEngine {
  return (
    typeof value === "string" &&
    (TRANSLATION_ENGINES as readonly string[]).includes(value)
  );
}

/** 一次翻译请求最多几段文本——挡住把整页几千个节点塞进一次调用。 */
export const TRANSLATION_MAX_BATCH = 64;
/** 单段文本上限，超出的段跳过不译（正文里没有这么长的单节点，命中的多半是脏数据）。 */
export const TRANSLATION_MAX_CHARS = 5000;

/**
 * 公开面拿到的配置：**只有浏览器能安全知道的部分**。
 * 任何接口都不要把 `api_key` 回给浏览器。
 */
export interface PublicTranslationConfig {
  enabled: boolean;
  engine: TranslationEngine;
  /** 客户端直连端点；`proxy` 为 true 时恒为 null（端点也留在服务端）。 */
  endpoint: string | null;
  /** true = 调 `/api/public/translation/translate`，由服务端持 key 转发。 */
  proxy: boolean;
  /** 可选的目标语言（BCP 47）。默认 = `APP_LOCALES`。 */
  targets: string[];
  /** 租户补充的「不要翻译」术语，与内置规则合并。 */
  keep_terms: string[];
}

/** 工作台设置页读到的状态：多了 key 的掩码，仍然没有 key 本身。 */
export interface TranslationStatus extends PublicTranslationConfig {
  api_key_hint: string | null;
  has_api_key: boolean;
}

export interface TranslationWriteBody {
  enabled?: boolean;
  engine?: TranslationEngine;
  endpoint?: string | null;
  /** 只写不读。空串 = 清除已存的 key。 */
  api_key?: string | null;
  targets?: string[];
  keep_terms?: string[];
}

/** 代理路由的请求体（公开面调用，无需登录）。 */
export interface TranslateRequestBody {
  texts: string[];
  target: string;
  source?: string | null;
}

export interface TranslateResponseBody {
  /** 与 `texts` 等长同序；某段翻不出时回原文，不回 null——调用方不必再分支。 */
  texts: string[];
}

export function defaultTranslationTargets(): string[] {
  return APP_LOCALES.map((locale) => locale.slug);
}

export function defaultTranslationConfig(): PublicTranslationConfig {
  return {
    enabled: false,
    engine: DEFAULT_TRANSLATION_ENGINE,
    endpoint: null,
    proxy: engineNeedsProxy(DEFAULT_TRANSLATION_ENGINE),
    targets: defaultTranslationTargets(),
    keep_terms: [],
  };
}
