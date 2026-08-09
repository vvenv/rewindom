/**
 * `doc-list` 的取数：从上下文里的文档目录挑出这一段要展示的那些。
 *
 * 单独成文件是因为两端渲染都要它（SSR 的 `html.ts` 与客户端的 `views/doc-list.tsx`），
 * 而它不该住在任何一端——两边各写一份筛选逻辑，编辑器预览与线上就会显示不同的文档。
 */

import { groupDocsByCategory, type PublicDocSummary } from "../../marketing-doc.js";
import {
  settingBool,
  settingNumber,
  settingText,
  type SettingValues,
} from "../../section-settings.js";

export interface DocListView {
  style: "cards" | "list";
  columns: number;
  showDescription: boolean;
  showUpdated: boolean;
  /** 分组后的文档；不分组时是**一组**且 `category` 为空串。 */
  groups: Array<{ category: string; items: PublicDocSummary[] }>;
}

/**
 * @param otherLabel 没填分类的那一组的标题（按访客语言，见 `docMessages`）。
 */
export function resolveDocList(
  settings: SettingValues,
  docs: readonly PublicDocSummary[],
  otherLabel: string,
): DocListView {
  const filter = settingText(settings, "category").trim();
  const filtered = filter
    ? docs.filter((doc) => doc.category === filter)
    : docs;
  // 0 = 不限；`limit` 是给「首页放最新几篇」这种用法的，不是分页
  const limit = settingNumber(settings, "limit", 0);
  const limited = limit > 0 ? filtered.slice(0, limit) : filtered;

  const groups =
    settingText(settings, "group_by") === "none"
      ? limited.length > 0
        ? [{ category: "", items: [...limited] }]
        : []
      : groupDocsByCategory(limited, otherLabel);

  return {
    style: settingText(settings, "style") === "list" ? "list" : "cards",
    columns: settingNumber(settings, "columns", 2),
    showDescription: settingBool(settings, "show_description"),
    showUpdated: settingBool(settings, "show_updated"),
    groups,
  };
}
