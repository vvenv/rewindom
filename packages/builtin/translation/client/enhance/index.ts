/**
 * 公开站按需翻译 —— 被 `site-enhance/assemble.mjs` 扫到并拼进
 * `/api/public/site-enhance.js` 的入口。
 *
 * 流程刻意保持「什么都不做」在最前面：配置没开、浏览器不支持、正文本来就是
 * 目标语言 —— 任意一条命中就**连按钮都不挂**，公开页与没装这个模块时一模一样。
 * 只有真的能翻、且值得翻时，才多出右下角一个控件。
 *
 * 译文只存在于当前这次浏览：不落库、不进 SSR、不进 sitemap，爬虫看到的永远是
 * 原文。这正是「翻译是查看辅助，不是产品资产」这条口径的技术表达。
 */


import {
  guessSourceLanguage,
  isAlreadyInTargetLanguage,
  looksLikeTargetLanguage,
} from "../../shared/messages.js";
import {
  TRANSLATION_MAX_BATCH,
  defaultTranslationConfig,
  type PublicTranslationConfig,
} from "../../shared/translation.js";
import {
  applyTranslations,
  collectTextNodes,
  restoreTranslations,
} from "../lib/translate-dom.js";
import { createTranslator } from "../lib/translator.js";

import { mountTranslateWidget, type TranslateWidget } from "./widget.js";

import type { AppLocale } from "@rewindom/shared";

/** 访客上次的选择。公开站是 MPA，每次点链接都是整页刷新，不记住等于每页点一次。 */
const PREFERENCE_KEY = "rw-translate-on";

/** 扫描根：只翻正文。页头页脚是代码 i18n 的地盘，`translate-dom` 里也再挡一次。 */
const CONTENT_ROOT = "main.site-main";

function readPreference(): boolean {
  try {
    return sessionStorage.getItem(PREFERENCE_KEY) === "1";
  } catch {
    return false;
  }
}

function writePreference(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(PREFERENCE_KEY, "1");
    else sessionStorage.removeItem(PREFERENCE_KEY);
  } catch {
    // 无痕模式写不进去，只是不跨页记忆，不影响本页
  }
}

async function fetchConfig(): Promise<PublicTranslationConfig> {
  try {
    const response = await fetch("/api/public/translation/config", {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return defaultTranslationConfig();
    const body = (await response.json()) as {
      data?: PublicTranslationConfig;
    };
    return body.data ?? defaultTranslationConfig();
  } catch {
    return defaultTranslationConfig();
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** 视口内的先翻：长页面上访客立刻能看到效果，剩下的边滚边补。 */
function viewportFirst(nodes: Text[]): Text[] {
  const height = window.innerHeight || 800;
  const score = (node: Text): number => {
    const rect = node.parentElement?.getBoundingClientRect();
    if (!rect) return Number.MAX_SAFE_INTEGER;
    return rect.top >= 0 && rect.top < height ? 0 : 1;
  };
  return [...nodes].sort((a, b) => score(a) - score(b));
}

export function enhanceSite(context: { locale: AppLocale }): void {
  const root = document.querySelector(CONTENT_ROOT);
  if (!root) return;
  void start(root, context.locale);
}

async function start(root: Element, locale: AppLocale): Promise<void> {
  const config = await fetchConfig();
  if (!config.enabled) return;
  if (!config.targets.includes(locale)) return;

  const probe = collectTextNodes(root);
  if (probe.nodes.length === 0) return;
  /*
   * 只拿**待翻**的那部分判断要不要挂按钮。
   *
   * 拿整页判断会被界面文案带偏：中文站的段标题、按钮、说明都是中文，混进来
   * 一算 CJK 占比就过线，于是「整页看起来已经是中文了」——可事件标题明明还是
   * 英文。这正是按钮该出现的场景，却被判没了。
   */
  const pending = probe.texts.filter(
    (text) => !isAlreadyInTargetLanguage(text, locale),
  );
  if (pending.length === 0) return;
  if (looksLikeTargetLanguage(pending.join(" "), locale)) return;

  /*
   * 源语言在**挂控件之前**就定好，而不是等到翻译时再探测。
   *
   * `Translator.create()` 在模型未下载时要求处于用户手势有效期内；点击后先
   * `await LanguageDetector.create()` 再去 create，手势早过期了，Chrome 抛
   * `NotAllowedError`——表现就是「点了按钮什么都没发生」。把探测挪到加载期，
   * 点击那一刻才能同步 prime。
   */
  const source = guessSourceLanguage(pending.join(" "));

  let widget: TranslateWidget | null = null;
  /*
   * 下载进度事件会**晚于**翻译完成继续到达（模型下载与首批翻译是并行的），
   * 不设这道闸，最后一条 progress 会把「显示原文」盖回「正在准备…100%」——
   * 页面已经翻好了，按钮却停在准备中。
   */
  let settled = false;
  const translator = createTranslator({
    config,
    target: locale,
    source,
    onDownloadProgress: (ratio) => {
      if (settled) return;
      widget?.setState("downloading", { ratio });
    },
  });
  if (!(await translator.available())) return;

  const originals = new Map<Text, string>();
  let translated = false;
  let running = false;

  /** @returns 实际被改写的文本节点数。0 = 一个字都没译出来。 */
  const runTranslation = async (): Promise<number> => {
    running = true;
    settled = false;
    // 重新扫一遍：从上次探测到现在，会员正文解锁等可能换过 DOM
    const snapshot = collectTextNodes(root);
    /*
     * 只翻内容，不翻界面。页面上混着两类文本：站点文案 / 段标题（CMS 写好的
     * 或代码 i18n 出来的，**本来就是站点语言**）和事件正文（来源原文）。
     * 已经是目标语言的节点直接跳过——既是正确性（不该把「正在升温」再翻一遍），
     * 也省掉大半的引擎调用。
     */
    const translatable = snapshot.nodes.filter(
      (node) => !isAlreadyInTargetLanguage(node.nodeValue ?? "", locale),
    );
    const ordered = viewportFirst(translatable);
    const batches = chunk(ordered, TRANSLATION_MAX_BATCH);
    widget?.setState("working", { done: 0, total: batches.length });

    let changed = 0;
    for (const [index, batch] of batches.entries()) {
      const texts = batch.map((node) => node.nodeValue ?? "");
      const result = await translator.translate(texts);
      changed += applyTranslations({ nodes: batch, texts }, result, originals);
      widget?.setState("working", { done: index + 1, total: batches.length });
    }

    running = false;
    settled = true;
    /*
     * **必须按实际结果置状态。** 引擎的失败被 translator 吞成「保留原文」，
     * 这里再无条件报成功，读者看到的就是「按钮说翻完了，页面一个字没变」——
     * 比直接报错糟得多，因为它掩盖了故障。
     */
    translated = changed > 0;
    widget?.setState(translated ? "translated" : "failed");
    if (!translated) writePreference(false);
    return changed;
  };

  const toggle = (): void => {
    if (running) return;
    if (translated) {
      restoreTranslations(originals);
      translated = false;
      writePreference(false);
      widget?.setState("idle");
      return;
    }
    // 同步预热，必须在任何 await 之前——这一行就是手势有效期本身
    settled = false;
    translator.prime();
    writePreference(true);
    void runTranslation();
  };

  widget = mountTranslateWidget(locale, toggle);
  widget.setState("idle");

  /*
   * 上一页开着就继续开着。这里**没有用户手势**，模型没下载好时会失败并落到
   * "failed" 状态——那是对的：同一个标签页里第一次一定是点出来的，模型早已就位。
   */
  if (readPreference()) {
    translator.prime();
    void runTranslation();
  }
}
