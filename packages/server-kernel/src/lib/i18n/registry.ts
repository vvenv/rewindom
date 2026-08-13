import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  normalizeLocale,
  type AppLocale,
} from "@rewindom/shared";

import { KERNEL_MESSAGES_EN } from "./catalogs/kernel-en.js";
import { KERNEL_MESSAGES_ZH } from "./catalogs/kernel-zh-CN.js";
import { formatMessage } from "./format-message.js";

import type { ServerI18nBundle, TranslateMessageInput } from "./types.js";

type LocaleTable = Record<string, string>;

const catalogs: Record<AppLocale, LocaleTable> = {
  "zh-CN": { ...KERNEL_MESSAGES_ZH },
  en: { ...KERNEL_MESSAGES_EN },
};

let bootstrapped = false;

function ensureKernelSeeded(): void {
  if (bootstrapped) return;
  bootstrapped = true;
}

/** 合并模块 / kernel 消息包（后注册覆盖同 code）。 */
export function registerServerI18nBundles(
  bundles: readonly ServerI18nBundle[],
): void {
  ensureKernelSeeded();
  for (const bundle of bundles) {
    for (const { slug } of APP_LOCALES) {
      const table = bundle.messages[slug];
      if (!table) continue;
      catalogs[slug] = { ...catalogs[slug], ...table };
    }
  }
}

export function collectServerI18nBundles(
  modules: readonly { server?: { i18n?: ServerI18nBundle } }[],
): ServerI18nBundle[] {
  const bundles: ServerI18nBundle[] = [];
  for (const module of modules) {
    if (module.server?.i18n) {
      bundles.push(module.server.i18n);
    }
  }
  return bundles;
}

export function lookupServerMessage(
  locale: AppLocale,
  code: string,
): string | undefined {
  ensureKernelSeeded();
  return catalogs[normalizeLocale(locale)]?.[code];
}

/**
 * 按稳定 code 翻译；无 code 时返回 message（默认语言）或原样。
 * 不再支持中文原文 → 英文的遗留对照表。
 */
export function translateServerMessage(
  locale: AppLocale,
  input: TranslateMessageInput,
): string {
  ensureKernelSeeded();
  const lng = normalizeLocale(locale);
  const { code, message, params } = input;

  if (code) {
    const template = lookupServerMessage(lng, code);
    if (template !== undefined) {
      return formatMessage(template, params);
    }
    if (lng !== DEFAULT_LOCALE) {
      const zh = lookupServerMessage(DEFAULT_LOCALE, code);
      if (zh !== undefined) {
        return formatMessage(zh, params);
      }
    }
  }

  const fallback = message ?? code ?? "";
  if (!fallback) return "";
  return formatMessage(fallback, params);
}

/** 测试或热重载时清空模块贡献（保留 kernel 种子需重新 register）。 */
export function resetServerI18nCatalogsForTests(): void {
  catalogs["zh-CN"] = { ...KERNEL_MESSAGES_ZH };
  catalogs.en = { ...KERNEL_MESSAGES_EN };
  bootstrapped = false;
}
