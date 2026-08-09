/**
 * 编辑器里「当前这套菜单」的上下文。
 *
 * `menu` 设置项的下拉需要菜单表，而菜单是**未保存的草稿状态**（跟页头页脚一起
 * 在编辑器内存里改、一起保存），不能像 `SiteLinkField` 那样去查接口——查回来的是
 * 库里那一份，租户刚新建的菜单不会在里面。
 *
 * 走 context 而不是一路透传 props：从编辑器页到那个下拉之间隔着
 * `SectionSettingsForm` → `SettingsFields` → `SettingField` 三层，中间两层
 * 对菜单毫无兴趣，让它们签收一个只是路过的 prop 只会把签名越堆越长。
 */

import { createContext, useContext, type ReactNode } from "react";

import type { SiteMenu } from "../../../shared/site-menu.js";

export interface SiteMenusContextValue {
  menus: SiteMenu[];
  /** 打开菜单管理面板，可指定要展开哪一个。 */
  openManager: (menuKey?: string) => void;
}

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
 * 段的设置表单在别处（如测试、未来的独立预览）也可能被单独渲染，为了一个下拉
 * 让整棵树炸掉不值得——空表的表现是「一个菜单都没有」，看得见、也说得通。
 */
export function useSiteMenus(): SiteMenusContextValue {
  return (
    useContext(SiteMenusContext) ?? {
      menus: [],
      openManager: () => undefined,
    }
  );
}
