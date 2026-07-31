import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import {
  DEFAULT_LOCALE,
  normalizeLocale,
  normalizeOptionalLocale,
  type AppLocale,
} from "@be-water/shared";

import { setApiAcceptLanguage } from "../api.js";
import { useOptionalAuth } from "../hooks/useOptionalAuth.js";
import { usePublicConfig } from "../hooks/usePublicConfig.js";
import { useResolvedPreference } from "../hooks/useResolvedPreference.js";
import { useTenantAppearance } from "../hooks/useTenantAppearance.js";
import { changeAppLanguage, setupI18n } from "../i18n/setup.js";
import {
  APP_LOCALE_DEFAULT_CACHE_KEY,
  APP_LOCALE_STORAGE_KEY,
} from "../lib/read-stored-locale.js";

export interface LocaleValue {
  /** 当前实际生效的语言：用户选择 > 服务端默认 > zh-CN。 */
  locale: AppLocale;
  /** 用户的显式选择；`null` 表示跟随默认。 */
  userChoice: AppLocale | null;
  /** 租户（或平台）下发的默认语言。 */
  defaultLocale: AppLocale;
  /** 传 `null` 恢复为跟随默认。 */
  setLocale: (locale: AppLocale | null) => void;
}

const LocaleContext = createContext<LocaleValue | null>(null);

/**
 * 语言轴 Provider——挂在应用根部（登录页 / 平台控制台 / 租户壳共用）。
 *
 * 三级优先级与主题/布局同构：用户本地选择 > 服务端默认 > 代码兜底。
 * 服务端默认：已进租户壳时用 appearance.locale，否则用公开配置 default_locale。
 */
export function LocaleProvider({ children }: { children: ReactNode }): ReactNode {
  const auth = useOptionalAuth();
  const isTenantSession =
    Boolean(auth?.user) && !auth.user.is_system_admin && !auth.isLoading;
  const { data: appearance } = useTenantAppearance(isTenantSession);
  const { data: publicConfig } = usePublicConfig();

  const serverDefault = appearance?.locale ?? publicConfig.default_locale;

  const { value, userChoice, defaultValue, setValue } = useResolvedPreference({
    storageKey: APP_LOCALE_STORAGE_KEY,
    cacheKey: APP_LOCALE_DEFAULT_CACHE_KEY,
    serverDefault,
    normalize: normalizeLocale,
    normalizeOptional: normalizeOptionalLocale,
  });

  // 渲染期同步 i18n，避免首帧仍用 setup 默认语言（刷新后闪中文）。
  setupI18n(value);
  setApiAcceptLanguage(value);

  useEffect(() => {
    void changeAppLanguage(value);
  }, [value]);

  const contextValue = useMemo<LocaleValue>(
    () => ({
      locale: value,
      userChoice,
      defaultLocale: defaultValue,
      setLocale: setValue,
    }),
    [value, userChoice, defaultValue, setValue],
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return {
    locale: DEFAULT_LOCALE,
    userChoice: null,
    defaultLocale: DEFAULT_LOCALE,
    setLocale: () => {},
  };
}
