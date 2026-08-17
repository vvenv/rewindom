/**
 * 提交列表的展示逻辑（纯函数，可单测）。
 */

import type { FormEntry } from "../../shared/sections/form/fields.js";

/**
 * 一条提交在表格里的一行摘要。
 *
 * 字段是租户自己定义的，列不可能固定；把「标签: 值」拼成一行，比硬凑几列再让大半
 * 内容落到「其它」里可读得多。真要看全的展开行里有完整表格。
 */
export function summarizeEntries(entries: FormEntry[], max = 3): string {
  if (entries.length === 0) return "";
  const shown = entries
    .slice(0, max)
    .map((entry) => `${entry.label}: ${entry.value}`)
    .join(" · ");
  return entries.length > max ? `${shown} …` : shown;
}

/** 表单标题留空时用页面路径兜底，别在列表里显示一片空白。 */
export function submissionSource(input: {
  form_title: string;
  page_slug: string;
}): string {
  return input.form_title.trim() || `/${input.page_slug}`;
}
