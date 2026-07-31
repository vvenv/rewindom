import { pathToFileURL } from "node:url";

import {
  registerI18nBundles,
  setupI18n,
} from "@be-water/client-kit/i18n/setup";

import type { ClientI18nBundle } from "@be-water/client-kit";

function isI18nBundle(value: unknown): value is ClientI18nBundle {
  return (
    typeof value === "object" &&
    value !== null &&
    "ns" in value &&
    "resources" in value
  );
}

/**
 * 各模块 client 测试项目在存在 `i18n.ts` 时挂载：自动注册该模块文案包。
 * 路径由 `createModuleClientTestProject` 经 `BE_WATER_CLIENT_I18N` 注入。
 */
const i18nPath = process.env.BE_WATER_CLIENT_I18N;
if (i18nPath) {
  const mod: Record<string, unknown> = await import(
    pathToFileURL(i18nPath).href
  );
  const bundles = Object.values(mod).filter(isI18nBundle);
  if (bundles.length > 0) {
    registerI18nBundles(bundles);
    setupI18n("zh-CN");
  }
}
