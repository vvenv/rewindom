import { createContext, useContext, type ReactNode } from "react";

import type { PublicDocSummary } from "../../../shared/marketing-doc.js";
import type { SiteNavItem } from "../../../shared/site-nav.js";

/**
 * 导航编辑器预览所需的内容快照 + 页头条目（页脚「从页头复制」用）。
 *
 * 以前挂在 SiteMenusProvider 上；菜单实体拆掉后只剩这份只读上下文。
 */
export interface SiteNavPreviewValue {
  navPages: readonly { path: string; title: string }[];
  docs: readonly PublicDocSummary[];
  /** 当前草稿页头的导航条目；页脚列复制时读它。 */
  headerItems: readonly SiteNavItem[];
}

const EMPTY: SiteNavPreviewValue = {
  navPages: [],
  docs: [],
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
