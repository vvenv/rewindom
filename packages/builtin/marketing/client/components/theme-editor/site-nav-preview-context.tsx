import { createContext, useContext, type ReactNode } from "react";

import type { SiteNavItem } from "../../../shared/site-nav.js";

/**
 * 导航编辑器预览所需的内容快照 + 页头条目（页脚「从页头复制」用）。
 *
 * 贡献源（文档库等）的数据走 `contributed`，与 SSR 的 `SiteNavContext` 同一口径。
 */
export interface SiteNavPreviewValue {
  navPages: readonly { path: string; title: string }[];
  contributed?: Readonly<Record<string, unknown>>;
  /** 当前草稿页头的导航条目；页脚列复制时读它。 */
  headerItems: readonly SiteNavItem[];
}

const EMPTY: SiteNavPreviewValue = {
  navPages: [],
  headerItems: [],
};

const SiteNavPreviewContext = createContext<SiteNavPreviewValue>(EMPTY);

export function SiteNavPreviewProvider({
  value,
  children,
}: {
  value: SiteNavPreviewValue;
  children: ReactNode;
}): React.ReactElement {
  return (
    <SiteNavPreviewContext.Provider value={value}>
      {children}
    </SiteNavPreviewContext.Provider>
  );
}

export function useSiteNavPreview(): SiteNavPreviewValue {
  return useContext(SiteNavPreviewContext);
}
