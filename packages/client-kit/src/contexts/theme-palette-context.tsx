import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from "react";

import {
  DEFAULT_THEME_PALETTE,
  normalizeOptionalThemePalette,
  normalizeThemePalette,
  type ThemePaletteSlug,
} from "@rewindom/shared";

import { useResolvedPreference } from "../hooks/useResolvedPreference.js";
import { useTenantAppearance } from "../hooks/useTenantAppearance.js";

/** 用户显式选择的主题；键不存在 = 跟随租户默认。 */
const USER_CHOICE_KEY = "theme-palette";
/** 上一次解析出的租户默认，用于消除下次进入时的首屏配色闪烁。 */
const CACHED_DEFAULT_KEY = "theme-palette-default";

export interface ThemePaletteValue {
  /** 当前实际生效的主题：用户选择 > 租户默认 > 平台默认 > azure。 */
  palette: ThemePaletteSlug;
  /** 用户的显式选择；`null` 表示跟随默认。 */
  userChoice: ThemePaletteSlug | null;
  /** 租户（或平台）下发的默认主题。 */
  defaultPalette: ThemePaletteSlug;
  /** 传 `null` 恢复为跟随默认。 */
  setPalette: (palette: ThemePaletteSlug | null) => void;
}

const ThemePaletteContext = createContext<ThemePaletteValue | null>(null);

/**
 * 主题（配色方案）轴的 Provider——与 next-themes 的明暗轴正交。
 *
 * 只挂在租户外壳里（`AppLayout`）：卸载时移除 `data-theme`，于是登录页与平台
 * 控制台始终落在 `index.css` 的 `:root` / `.dark`（azure）上，不受租户配色影响。
 */
export function ThemePaletteProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const { data } = useTenantAppearance();

  const { value, userChoice, defaultValue, setValue } = useResolvedPreference({
    storageKey: USER_CHOICE_KEY,
    cacheKey: CACHED_DEFAULT_KEY,
    serverDefault: data?.theme,
    normalize: normalizeThemePalette,
    normalizeOptional: normalizeOptionalThemePalette,
  });

  // useLayoutEffect：在首帧绘制前打上 data-theme，避免 azure → 目标配色的闪烁
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = value;
    return () => {
      delete root.dataset.theme;
    };
  }, [value]);

  const contextValue = useMemo<ThemePaletteValue>(
    () => ({
      palette: value,
      userChoice,
      defaultPalette: defaultValue,
      setPalette: setValue,
    }),
    [value, userChoice, defaultValue, setValue],
  );

  return (
    <ThemePaletteContext.Provider value={contextValue}>
      {children}
    </ThemePaletteContext.Provider>
  );
}

/**
 * 在 Provider 之外（登录页、平台控制台）调用是合法的：返回一个固定在默认配色、
 * `setPalette` 为空操作的值，调用方不必到处判空。
 */
export function useThemePalette(): ThemePaletteValue {
  const ctx = useContext(ThemePaletteContext);
  if (ctx) return ctx;
  return {
    palette: DEFAULT_THEME_PALETTE,
    userChoice: null,
    defaultPalette: DEFAULT_THEME_PALETTE,
    setPalette: () => {},
  };
}
