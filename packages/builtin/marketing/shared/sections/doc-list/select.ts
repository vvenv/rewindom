/**
 * `doc-list` 的取数：从上下文里的文档目录挑出这一段要展示的那些。
 *
 * 单独成文件是因为两端渲染都要它（SSR 的 `html.ts` 与客户端的 `views/doc-list.tsx`），
 * 而它不该住在任何一端——两边各写一份筛选逻辑，编辑器预览与线上就会显示不同的文档。
 */

import {
  groupDocsByCategory,
  type PublicDocSummary,
} from "../../marketing-doc.js";
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
  /**
   * 分组后的文档。`category` 为空串的那一组**不画标题**：不分组时的唯一一组，
   * 以及分组时没填分类的那些散条目，都走这条——没有分类就不硬造一个分类名。
   *
   * `category_label` 是这一组的显示名（`MarketingDocCategory.label` 解析后的那份），
   * 画标题时用它；`category` 本身是 key，不该出现在页面上。
   */
  groups: Array<{
    category: string;
    category_label: string;
    items: PublicDocSummary[];
  }>;
}

export function resolveDocList(
  settings: SettingValues,
  docs: readonly PublicDocSummary[],
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
        ? [{ category: "", category_label: "", items: [...limited] }]
        : []
      : groupDocsByCategory(limited);

  return {
    style: settingText(settings, "style") === "list" ? "list" : "cards",
    columns: settingNumber(settings, "columns", 2),
    showDescription: settingBool(settings, "show_description"),
    showUpdated: settingBool(settings, "show_updated"),
    groups,
  };
}

/**
 * 一篇文档的可搜索文本，拼成一条。
 *
 * SSR 把它写进每条 `<li>` 的 `data-doc-search`，公开站的增强脚本（无 React）直接
 * 读属性过滤——否则它得去 DOM 里东拼西凑标题、摘要、分类，拼出来的口径与这里
 * 稍有出入，线上搜到的结果就和别处对不上。
 *
 * 曾经这里还有 `matchesDocSearch` / `filterDocGroupsByQuery` 两个函数，供段内那个
 * 搜索框在 React 里过滤。段内搜索框已经删了（唯一入口收到页头），过滤发生在
 * `enhance/doc-search.ts` 里、按这个属性做，所以那两个也一并去掉。
 */
export function docSearchHaystack(doc: PublicDocSummary): string {
  return [doc.title, doc.slug, doc.description, doc.category, doc.category_label]
    .join(" ")
    .toLowerCase();
}
