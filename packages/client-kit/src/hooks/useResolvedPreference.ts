import { useCallback, useEffect, useState } from "react";

import {
  readPersistedValue,
  removePersistedValue,
  writePersistedValue,
} from "../lib/persist-storage.js";

const IDENTITY = {
  serialize: (v: string) => v,
  deserialize: (v: string) => v,
};

export interface ResolvedPreference<T extends string> {
  /** 实际生效值：用户选择 > 服务端下发的默认 > 代码兜底。 */
  value: T;
  /** 用户的显式选择；`null` 表示跟随默认。 */
  userChoice: T | null;
  /** 服务端下发的默认（租户配置或平台默认）。 */
  defaultValue: T;
  /** 传 `null` 恢复为跟随默认。 */
  setValue: (next: T | null) => void;
}

export interface UseResolvedPreferenceOptions<T extends string> {
  /** 用户显式选择的 localStorage 键；键不存在 = 跟随默认。 */
  storageKey: string;
  /** 上次服务端默认值的缓存键，用于消除下次进入时的首屏闪烁。 */
  cacheKey: string;
  /** 服务端下发的默认值；未加载完时传 `undefined`。 */
  serverDefault: string | undefined;
  /** 非法值收敛到兜底。 */
  normalize: (value: unknown) => T;
  /** 非法值收敛到 `null`（表示跟随默认）。 */
  normalizeOptional: (value: unknown) => T | null;
}

/**
 * 三级偏好解析：**用户本地选择 > 服务端默认 > 代码兜底**。
 *
 * 主题与布局共用这套逻辑——两者都是「平台设默认、租户可覆盖、用户可再覆盖」，
 * 且用户那一级都只存浏览器（与既有 dark/light 一致，换设备回落到租户默认）。
 */
export function useResolvedPreference<T extends string>({
  storageKey,
  cacheKey,
  serverDefault,
  normalize,
  normalizeOptional,
}: UseResolvedPreferenceOptions<T>): ResolvedPreference<T> {
  const [userChoice, setUserChoice] = useState<T | null>(() =>
    normalizeOptional(
      readPersistedValue<string | null>({
        key: storageKey,
        defaultValue: null,
        deserialize: IDENTITY.deserialize,
      }),
    ),
  );

  const [cachedDefault, setCachedDefault] = useState<T>(() =>
    normalize(
      readPersistedValue<string | null>({
        key: cacheKey,
        defaultValue: null,
        deserialize: IDENTITY.deserialize,
      }),
    ),
  );

  const defaultValue =
    serverDefault !== undefined ? normalize(serverDefault) : cachedDefault;

  // 缓存服务端下发的默认值，下次进入时首帧就能用上，不必等接口回来
  useEffect(() => {
    if (serverDefault === undefined) return;
    const next = normalize(serverDefault);
    if (next !== cachedDefault) {
      writePersistedValue(cacheKey, next, IDENTITY.serialize);
      setCachedDefault(next);
    }
  }, [cacheKey, cachedDefault, normalize, serverDefault]);

  const setValue = useCallback(
    (next: T | null) => {
      setUserChoice(next);
      if (next === null) {
        removePersistedValue(storageKey);
      } else {
        writePersistedValue(storageKey, next, IDENTITY.serialize);
      }
    },
    [storageKey],
  );

  return {
    value: userChoice ?? defaultValue,
    userChoice,
    defaultValue,
    setValue,
  };
}
