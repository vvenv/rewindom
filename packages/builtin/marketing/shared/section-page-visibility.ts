/**
 * 页头 / 页脚区里的段可以限制「只在这些页面上出现」。
 *
 * 空列表 = 全站（默认，兼容存量）。勾选后按**逻辑路径**匹配当前页：普通页是
 * `/about`，模板页可能是 `/docs/:slug`（那一张版式管这一类全部详情）。
 *
 * 页头 / 页脚**本体**不走这条——导航条始终在。
 */

import {
  isInputSetting,
  normalizeLogicalPagePath,
  settingPagePaths,
  VISIBLE_ON_SETTING_ID,
  type SettingDef,
} from "./section-settings.js";

import type { SiteSection } from "./sections/types.js";

/** 这一段在当前页要不要渲染。没有限制、或没有当前路径时都显示（缺路径 fail-open，照顾旧测试）。 */
export function sectionVisibleOnPage(
  section: SiteSection,
  currentPath: string | undefined,
): boolean {
  const paths = settingPagePaths(section.settings, VISIBLE_ON_SETTING_ID);
  if (paths.length === 0) return true;
  if (!currentPath) return true;
  const current = normalizeLogicalPagePath(currentPath);
  if (!current) return true;
  return paths.includes(current);
}

/** 有限制且当前页不在名单里——编辑器树用来画「本页不显示」。 */
export function sectionHiddenOnCurrentPage(
  section: SiteSection,
  currentPath: string | undefined,
): boolean {
  const paths = settingPagePaths(section.settings, VISIBLE_ON_SETTING_ID);
  if (paths.length === 0 || !currentPath) return false;
  const current = normalizeLogicalPagePath(currentPath);
  if (!current) return false;
  return !paths.includes(current);
}

/**
 * 页面段流不展示这项：段已经只属于这一页，再勾「仅这些页面」会误导。
 * 页头 / 页脚区才露出。
 */
export function omitAreaPageVisibilitySettings(defs: SettingDef[]): SettingDef[] {
  return defs.filter((def) => {
    if (def.type === "header" && def.content === "editor.group.visible_on") {
      return false;
    }
    if (isInputSetting(def) && def.id === VISIBLE_ON_SETTING_ID) return false;
    return true;
  });
}
