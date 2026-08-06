import { useEffect, useState } from "react";

import { fetchPublicSite } from "../lib/site-api.js";

import type { PublicMarketingSite } from "../../shared/site-cms.js";
import type { AppLocale } from "@be-water/shared";

export type TenantPublicSiteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "none" }
  | { status: "ready"; site: PublicMarketingSite };

/**
 * 拉取当前 Host 已发布的租户站点（主域 = 默认租户）。
 * 仅用 useEffect（不用 React Query），公开页可在无 QueryClient 的轻量宿主里跑。
 *
 * `locale` 只在 URL 显式带了 `/{locale}` 前缀时传；不带前缀时由服务端按站点
 * `default_locale` 决定——客户端在拿到站点之前并不知道那是哪一种语言。
 */
export function useTenantPublicSite(locale?: AppLocale): TenantPublicSiteState {
  const [state, setState] = useState<TenantPublicSiteState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void fetchPublicSite(locale)
      .then((site) => {
        if (!cancelled) setState({ status: "ready", site });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "none" });
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return state;
}
