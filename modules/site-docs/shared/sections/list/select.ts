/**
 * `site-docs.list` 的取数：从上下文里的文档目录挑出这一段要展示的那些。
 *
 * 单独成文件是因为两端渲染都要它（SSR 的 `html.ts` 与客户端的 `views/list.tsx`）。
 */

import {
  groupDocsByCategory,
  type PublicDocSummary,
} from "../../site-doc.js";
import {
  settingBool,
  settingNumber,
  settingText,
  type SettingValues,
} from "../../../../../packages/builtin/marketing/shared/section-settings.js";

export interface DocListView {
  style: "cards" | "list";
  columns: number;
  showDescription: boolean;
  showUpdated: boolean;
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

export function docSearchHaystack(doc: PublicDocSummary): string {
  return [doc.title, doc.slug, doc.description, doc.category, doc.category_label]
    .join(" ")
    .toLowerCase();
}
