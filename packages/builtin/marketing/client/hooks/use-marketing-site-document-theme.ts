import { useEffect, useSyncExternalStore } from "react";

import {
  marketingSiteThemeCss,
  type ResolvedSiteColorMode,
  type SiteColorMode,
} from "../../shared/marketing-site-theme.js";
import {
  applySiteColorMode,
  getResolvedSiteColorMode,
  getSiteColorMode,
  setSiteColorMode,
  snapshotSiteColorMode,
  subscribeSiteColorMode,
} from "../lib/site-color-mode.js";

const THEME_MARK = "data-marketing-site-theme";

/** 访客明暗偏好；供页头切换按钮读写。 */
export function useSiteColorMode(): {
  mode: SiteColorMode;
  resolved: ResolvedSiteColorMode;
  setMode: (next: SiteColorMode) => void;
} {
  const mode = useSyncExternalStore(
    subscribeSiteColorMode,
    getSiteColorMode,
    () => "system" as SiteColorMode,
  );
  const resolved = useSyncExternalStore(
    subscribeSiteColorMode,
    getResolvedSiteColorMode,
    () => "light" as ResolvedSiteColorMode,
  );
  return { mode, resolved, setMode: setSiteColorMode };
}

/**
 * 把租户主题 token 挂到指定 document 的 `html`（下拉层 portal 到 body 也能读到），
 * 并把访客的明暗选择打在同一个 `html` 上。
 *
 * 两件事必须落在同一个根元素：变量块里的深色规则就是靠
 * `[data-site-color-mode="dark"]` 命中的。
 */
export function useMarketingSiteDocumentTheme(
  theme_settings: unknown,
  doc: Document,
): void {
  const { resolved } = useSiteColorMode();

  useEffect(() => {
    const style = doc.createElement("style");
    style.setAttribute(THEME_MARK, "");
    style.textContent = marketingSiteThemeCss(theme_settings, "html");
    doc.head.append(style);
    return () => {
      style.remove();
    };
  }, [theme_settings, doc]);

  useEffect(() => snapshotSiteColorMode(doc), [doc]);

  useEffect(() => {
    applySiteColorMode(doc, resolved);
  }, [doc, resolved]);
}
