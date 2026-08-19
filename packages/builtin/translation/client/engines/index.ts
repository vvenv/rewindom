/**
 * 按配置挑引擎。判据只有一条：`engineNeedsProxy` —— 要 key 的走代理，
 * 不要 key 的直连。别在这里给某个引擎开后门。
 */

import { engineNeedsProxy, type PublicTranslationConfig  } from "../../shared/translation.js";

import { createBrowserEngine } from "./browser.js";
import {
  createLibreTranslateEngine,
  createMyMemoryEngine,
  createProxyEngine,
} from "./http.js";


import type { TranslationEngineAdapter } from "./types.js";

export { isBrowserTranslationSupported } from "./browser.js";
export type { TranslationEngineAdapter } from "./types.js";
export { TranslationUnavailableError } from "./types.js";

export function createEngine(
  config: PublicTranslationConfig,
): TranslationEngineAdapter {
  if (config.proxy || engineNeedsProxy(config.engine)) return createProxyEngine();
  switch (config.engine) {
    case "libretranslate":
      // 端点是租户配的；没配就没得直连，回退到浏览器内置
      return config.endpoint
        ? createLibreTranslateEngine(config.endpoint)
        : createBrowserEngine();
    case "mymemory":
      return createMyMemoryEngine();
    default:
      return createBrowserEngine();
  }
}
