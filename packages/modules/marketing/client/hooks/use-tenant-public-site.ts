import { useEffect, useState } from "react";

import { fetchPublicSite } from "../lib/site-api.js";

import type { PublicMarketingSite } from "../../shared/site-cms.js";

export type TenantPublicSiteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "none" }
  | { status: "ready"; site: PublicMarketingSite };

/**
 * 绑定 Host 上拉取已发布租户站点。
 * 仅用 useEffect（不用 React Query），避免构建期预渲染因无 QueryClient 失败。
 * 预渲染不跑 effect → 始终走平台静态官网。
 */
export function useTenantPublicSite(): TenantPublicSiteState {
  const [state, setState] = useState<TenantPublicSiteState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void fetchPublicSite()
      .then((site) => {
        if (!cancelled) setState({ status: "ready", site });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "none" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
