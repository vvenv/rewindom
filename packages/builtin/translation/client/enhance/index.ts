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


import { looksLikeTargetLanguage } from "../../shared/messages.js";
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
  // 正文已经是站点语言了就别挂按钮——点下去什么都不会变
  if (looksLikeTargetLanguage(probe.texts.join(" "), locale)) return;

  const translator = createTranslator({
    config,
    target: locale,
    source: null,
    engine: undefined,
  });
  if (!(await translator.available())) return;

  const originals = new Map<Text, string>();
  let widget: TranslateWidget | null = null;
  let translated = false;
  let running = false;

  const runTranslation = async (): Promise<void> => {
    running = true;
    // 重新扫一遍：从上次探测到现在，会员正文解锁等可能换过 DOM
    const snapshot = collectTextNodes(root);
    const ordered = viewportFirst(snapshot.nodes);
    const batches = chunk(ordered, TRANSLATION_MAX_BATCH);
    widget?.setState("working", { done: 0, total: batches.length });

    for (const [index, batch] of batches.entries()) {
      const texts = batch.map((node) => node.nodeValue ?? "");
      const result = await translator.translate(texts);
      applyTranslations({ nodes: batch, texts }, result, originals);
      widget?.setState("working", { done: index + 1, total: batches.length });
    }

    translated = true;
    running = false;
    widget?.setState("translated");
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
    writePreference(true);
    void runTranslation();
  };

  widget = mountTranslateWidget(locale, toggle);
  widget.setState("idle");

  // 上一页开着就继续开着，不必每页再点一次
  if (readPreference()) void runTranslation();
}
