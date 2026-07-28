import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  DEFAULT_SHELL_LAYOUT,
  normalizeOptionalShellLayout,
  normalizeShellLayout,
  type ShellLayoutSlug,
} from "@be-water/shared";

import { useResolvedPreference } from "../hooks/useResolvedPreference.js";
import { useTenantAppearance } from "../hooks/useTenantAppearance.js";

/** 用户显式选择的布局；键不存在 = 跟随租户默认。 */
const USER_CHOICE_KEY = "shell-layout";
/** 上一次解析出的租户默认，用于消除下次进入时的首屏布局跳变。 */
const CACHED_DEFAULT_KEY = "shell-layout-default";

export interface ShellLayoutValue {
  /** 当前实际生效的布局：用户选择 > 租户默认 > 平台默认 > sidebar。 */
  layout: ShellLayoutSlug;
  userChoice: ShellLayoutSlug | null;
  defaultLayout: ShellLayoutSlug;
  /** 传 `null` 恢复为跟随默认。 */
  setLayout: (layout: ShellLayoutSlug | null) => void;
}

const ShellLayoutContext = createContext<ShellLayoutValue | null>(null);

/**
 * 外壳布局轴的 Provider。与 `ThemePaletteProvider` 共用同一个
 * `useTenantAppearance` 查询（react-query 按 key 去重，不会多发请求）。
 *
 * 注意这里**不做**窄屏判断：`layout` 是用户/租户的偏好，
 * 「窄屏一律走移动端外壳」是渲染层的事，见 `AppLayout`。
 * 偏好与生效条件分开，切到窄屏再切回来不会丢用户的选择。
 */
export function ShellLayoutProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const { data } = useTenantAppearance();

  const { value, userChoice, defaultValue, setValue } = useResolvedPreference({
    storageKey: USER_CHOICE_KEY,
    cacheKey: CACHED_DEFAULT_KEY,
    serverDefault: data?.layout,
    normalize: normalizeShellLayout,
    normalizeOptional: normalizeOptionalShellLayout,
  });

  const contextValue = useMemo<ShellLayoutValue>(
    () => ({
      layout: value,
      userChoice,
      defaultLayout: defaultValue,
      setLayout: setValue,
    }),
    [value, userChoice, defaultValue, setValue],
  );

  return (
    <ShellLayoutContext.Provider value={contextValue}>
      {children}
    </ShellLayoutContext.Provider>
  );
}

/** Provider 之外调用返回兜底值（左右布局、setLayout 空操作），调用方不必判空。 */
export function useShellLayout(): ShellLayoutValue {
  const ctx = useContext(ShellLayoutContext);
  if (ctx) return ctx;
  return {
    layout: DEFAULT_SHELL_LAYOUT,
    userChoice: null,
    defaultLayout: DEFAULT_SHELL_LAYOUT,
    setLayout: () => {},
  };
}
