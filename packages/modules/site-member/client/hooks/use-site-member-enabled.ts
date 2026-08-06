import { useEffect, useState } from "react";

import { siteMemberApi, SITE_MEMBER_API_BASE } from "../lib/site-member-api.js";

import type { SiteMemberConfig } from "../../shared/site-member.js";

/**
 * 本站是否开通会员体系。
 *
 * 用 `useEffect` 而不是 React Query：调用方在站点前台（公开路由树），那里没有
 * QueryClient，构建期预渲染也不跑 effect。结果按会话缓存，一个标签页只查一次。
 */
let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

function fetchEnabled(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached);
  inflight ??= siteMemberApi
    .get<SiteMemberConfig>(`${SITE_MEMBER_API_BASE}/config`, undefined, true)
    .then((config) => {
      cached = config.enabled;
      return cached;
    })
    .catch(() => {
      cached = false;
      return false;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useSiteMemberEnabled(): boolean {
  const [enabled, setEnabled] = useState(cached ?? false);

  useEffect(() => {
    let cancelled = false;
    void fetchEnabled().then((value) => {
      if (!cancelled) setEnabled(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
