import { useSearchParams } from "react-router";

import {
  parseSiteSettingsTab,
  type SiteSettingsTab,
} from "../lib/site-settings-form.js";

/**
 * 当前分区放 URL 上：刷新、收藏、从别处直接链到「外观」都成立，
 * 与列表页把筛选放 URL 同一口径。
 */
export function useSiteSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  return {
    tab: parseSiteSettingsTab(searchParams.get("tab")),
    setTab: (next: SiteSettingsTab): void => {
      const params = new URLSearchParams(searchParams);
      // 默认分区不写进 URL：`/app/site/settings` 本身就该是它
      if (next === "basics") params.delete("tab");
      else params.set("tab", next);
      setSearchParams(params, { replace: true });
    },
  };
}
