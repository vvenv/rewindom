import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  normalizeLocale,
  type AppLocale,
} from "@be-water/shared";

import commonEn from "./locales/en/common.json";
import shellEn from "./locales/en/shell.json";
import commonZh from "./locales/zh-CN/common.json";
import shellZh from "./locales/zh-CN/shell.json";

import type { ClientI18nBundle } from "../lib/module-contract.js";

/** 壳层自带的 namespace；业务文案由各模块 `client.i18n` 贡献。 */
export const SHELL_I18N_NAMESPACES = ["common", "shell"] as const;

const CORE_RESOURCES: Record<AppLocale, Record<string, object>> = {
  "zh-CN": {
    common: commonZh,
    shell: shellZh,
  },
  en: {
    common: commonEn,
    shell: shellEn,
  },
};

const pendingBundles: ClientI18nBundle[] = [];
let initialized = false;

function applyBundle(bundle: ClientI18nBundle): void {
  for (const { slug } of APP_LOCALES) {
    const resource = bundle.resources[slug];
    if (!resource) continue;
    i18n.addResourceBundle(slug, bundle.ns, resource, true, true);
  }
}

/**
 * 注册模块文案包。须在业务 `useTranslation` 之前调用；
 * 可在 `setupI18n` 前后多次调用（已 init 则走 `addResourceBundle`）。
 */
export function registerI18nBundles(
  bundles: readonly ClientI18nBundle[],
): void {
  for (const bundle of bundles) {
    if (initialized) {
      applyBundle(bundle);
      continue;
    }
    const index = pendingBundles.findIndex((item) => item.ns === bundle.ns);
    if (index >= 0) {
      pendingBundles[index] = bundle;
    } else {
      pendingBundles.push(bundle);
    }
  }
}

function buildInitResources(): Record<string, Record<string, object>> {
  const resources: Record<string, Record<string, object>> = {
    "zh-CN": { ...CORE_RESOURCES["zh-CN"] },
    en: { ...CORE_RESOURCES.en },
  };

  for (const bundle of pendingBundles) {
    for (const { slug } of APP_LOCALES) {
      const resource = bundle.resources[slug];
      if (!resource) continue;
      resources[slug] ??= {};
      resources[slug][bundle.ns] = resource;
    }
  }

  return resources;
}

/** 幂等初始化；可在测试里重复调用。 */
export function setupI18n(locale: AppLocale = DEFAULT_LOCALE): typeof i18n {
  if (!initialized) {
    const resources = buildInitResources();
    const ns = [
      ...SHELL_I18N_NAMESPACES,
      ...pendingBundles.map((bundle) => bundle.ns),
    ];
    void i18n.use(initReactI18next).init({
      resources,
      lng: normalizeLocale(locale),
      fallbackLng: DEFAULT_LOCALE,
      defaultNS: "common",
      ns,
      interpolation: { escapeValue: false },
      returnNull: false,
    });
    initialized = true;
  } else if (i18n.language !== locale) {
    void i18n.changeLanguage(normalizeLocale(locale));
  }
  return i18n;
}

export function getI18n(): typeof i18n {
  return setupI18n();
}

export async function changeAppLanguage(locale: AppLocale): Promise<void> {
  const next = normalizeLocale(locale);
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
  }
  await setupI18n().changeLanguage(next);
}

/** @deprecated 使用 `SHELL_I18N_NAMESPACES`；保留别名以免外部瞬时断裂。 */
export const I18N_NAMESPACES = SHELL_I18N_NAMESPACES;

export { i18n };
