/**
 * 编辑器里「站点的这套菜单」的上下文。
 *
 * 菜单是**未保存的草稿状态**（跟页头页脚一起在编辑器内存里改、一起保存），所以
 * 不能像 `SiteLinkField` 那样让控件自己去查接口——查回来的是库里那一份，租户刚
 * 加的那条链接不会在里面。
 *
 * 走 context 而不是一路透传 props：从编辑器页到菜单控件之间隔着
 * `SectionSettingsForm` → `SettingsFields` → `SettingField` 三层，中间几层对菜单
 * 毫无兴趣，让它们签收一堆只是路过的 prop 只会把签名越堆越长。
 */

import { createContext, useContext, type ReactNode } from "react";

import type { PublicDocSummary } from "../../../shared/marketing-doc.js";
import type { SiteMenu } from "../../../shared/site-menu.js";
import type { SiteMenuUsage } from "../../lib/site-menu-usage.js";

export interface SiteMenusContextValue {
  menus: SiteMenu[];
  /** 整表替换：菜单表跟 sections 一样是一份草稿，逐条 patch 没有意义。 */
  setMenus: (next: SiteMenu[]) => void;
  /** 菜单 key → 引用它的位置（见 `siteMenuUsage`）。 */
  usage: SiteMenuUsage;
  /**
   * 动态项就地预览的内容快照。
   *
   * 只给数据不给 locale：locale 由控件从设置表单那一侧拿（它本来就在按语言编辑
   * 文案），context 里再存一份就是同一个值的第二个来源。
   */
  preview: {
    /** 已筛过的一级页面（调用方用 `siteNavPages` 算好）。 */
    navPages: { path: string; title: string }[];
    docs: PublicDocSummary[];
  };
}

const EMPTY: SiteMenusContextValue = {
  menus: [],
  setMenus: () => undefined,
  usage: {},
  preview: { navPages: [], docs: [] },
};

const SiteMenusContext = createContext<SiteMenusContextValue | null>(null);

export function SiteMenusProvider({
  value,
  children,
}: {
  value: SiteMenusContextValue;
  children: ReactNode;
}): ReactNode {
  return (
    <SiteMenusContext.Provider value={value}>
      {children}
    </SiteMenusContext.Provider>
  );
}

/**
 * 没有 Provider 时返回空表而不是抛错。
 *
 * 段的设置表单在别处（如测试、未来的独立预览）也可能被单独渲染，为了一个字段
 * 让整棵树炸掉不值得——空表的表现是「这个站点还没有菜单」，看得见、也说得通。
 */
export function useSiteMenus(): SiteMenusContextValue {
  return useContext(SiteMenusContext) ?? EMPTY;
}
