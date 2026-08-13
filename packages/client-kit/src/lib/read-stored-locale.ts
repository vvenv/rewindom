import {
  DEFAULT_LOCALE,
  normalizeLocale,
  normalizeOptionalLocale,
  type AppLocale,
} from "@rewindom/shared";

import { readPersistedValue } from "./persist-storage.js";

/** 用户显式选择的语言；键不存在 = 跟随默认。 */
export const APP_LOCALE_STORAGE_KEY = "app-locale";
/** 上一次解析出的服务端默认，用于消除下次进入时的首屏语言闪烁。 */
export const APP_LOCALE_DEFAULT_CACHE_KEY = "app-locale-default";

const IDENTITY = {
  deserialize: (value: string): string => value,
};

/**
 * 同步读取浏览器里已持久化的界面语言（用户选择 > 缓存的默认 > zh-CN）。
 *
 * 须在 React 首屏前调用（`main.tsx` / `setupI18n`），否则 `useTranslation`
 * 会先按默认语言渲染一帧。预渲染 / Node 环境无 localStorage 时回落默认语言。
 */
export function readStoredAppLocale(): AppLocale {
  if (typeof localStorage === "undefined") {
    return DEFAULT_LOCALE;
  }

  const choice = normalizeOptionalLocale(
    readPersistedValue<string | null>({
      key: APP_LOCALE_STORAGE_KEY,
      defaultValue: null,
      deserialize: IDENTITY.deserialize,
    }),
  );
  if (choice) {
    return choice;
  }

  return normalizeLocale(
    readPersistedValue<string | null>({
      key: APP_LOCALE_DEFAULT_CACHE_KEY,
      defaultValue: null,
      deserialize: IDENTITY.deserialize,
    }),
  );
}
