/**
 * 文档分类：稳定 key + 多语言显示名。
 *
 * 文档各语言版本共用同一个 `category` key（存在 `SiteDoc.category`），
 * 显示名存在 `SiteDocCategory.label`（纯字符串或 `{ __i18n }`），与站名 /
 * 页头文案同口径。不再靠「中文一篇一个分类名、英文一篇另一个分类名」凑多语言。
 */

import { type AppLocale } from "@rewindom/module-sdk";

import {
  isLocalizedText,
  localizeSiteText,
  parseSiteNameValue,
  type LocalizedText,
} from "../../../packages/builtin/marketing/shared/section-settings.js";

/** 分类 key：字母数字开头结尾，中间可含连字符，最长 63。 */
const CATEGORY_KEY_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;

export interface SiteDocCategory {
  id: string;
  tenant_id: string;
  key: string;
  label: string | LocalizedText;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSiteDocCategoryBody {
  key: string;
  label: string | LocalizedText;
  sort_order?: number;
}

export interface UpdateSiteDocCategoryBody {
  label?: string | LocalizedText;
  sort_order?: number;
}

export interface ReorderSiteDocCategoriesBody {
  items: Array<{ id: string; sort_order: number }>;
}

/** 与 `listDocCategories` 的 `orderBy` 一致。 */
export function compareDocCategories(
  a: Pick<SiteDocCategory, "sort_order" | "key">,
  b: Pick<SiteDocCategory, "sort_order" | "key">,
): number {
  return a.sort_order - b.sort_order || a.key.localeCompare(b.key);
}

export function sortDocCategories<T extends SiteDocCategory>(
  categories: readonly T[],
): T[] {
  return [...categories].sort(compareDocCategories);
}

/** 默认租户产品文档库的 canonical 分类（usage docs seed 用）。 */
export const DEFAULT_DOC_CATEGORY_LABELS: Record<
  string,
  Record<AppLocale, string>
> = {
  "getting-started": {
    "zh-CN": "快速入门",
    en: "Getting started",
  },
  "core-concepts": {
    "zh-CN": "核心概念",
    en: "Core concepts",
  },
  "build-operate": {
    "zh-CN": "建站与运营",
    en: "Build and operate",
  },
  "platform-admin": {
    "zh-CN": "平台管理",
    en: "Platform admin",
  },
};

export function validateCategoryKey(value: unknown): string {
  if (typeof value !== "string") throw new Error("site.doc_category_key_invalid");
  const normalized = value.trim().toLowerCase();
  if (!CATEGORY_KEY_RE.test(normalized)) {
    throw new Error("site.doc_category_key_invalid");
  }
  return normalized;
}

export function parseCategoryLabel(value: unknown): string | LocalizedText {
  return parseSiteNameValue(value);
}

export function parseCreateCategoryBody(value: unknown): {
  key: string;
  label: string | LocalizedText;
  sort_order: number;
} {
  if (!value || typeof value !== "object") {
    throw new Error("site.doc_category_body_invalid");
  }
  const raw = value as Record<string, unknown>;
  const key = validateCategoryKey(raw.key);
  const label = parseCategoryLabel(raw.label);
  if (typeof label === "string" && !label.trim()) {
    throw new Error("site.doc_category_label_required");
  }
  if (isLocalizedText(label)) {
    const hasText = Object.values(label.__i18n).some((text) => text.trim() !== "");
    if (!hasText) throw new Error("site.doc_category_label_required");
  }
  return {
    key,
    label,
    sort_order:
      typeof raw.sort_order === "number" && Number.isFinite(raw.sort_order)
        ? Math.trunc(raw.sort_order)
        : 0,
  };
}

export function parseUpdateCategoryBody(value: unknown): {
  label?: string | LocalizedText;
  sort_order?: number;
} {
  if (!value || typeof value !== "object") {
    throw new Error("site.doc_category_body_invalid");
  }
  const raw = value as Record<string, unknown>;
  const out: {
    label?: string | LocalizedText;
    sort_order?: number;
  } = {};
  if (raw.label !== undefined) {
    const label = parseCategoryLabel(raw.label);
    if (typeof label === "string" && !label.trim()) {
      throw new Error("site.doc_category_label_required");
    }
    if (isLocalizedText(label)) {
      const hasText = Object.values(label.__i18n).some(
        (text) => text.trim() !== "",
      );
      if (!hasText) throw new Error("site.doc_category_label_required");
    }
    out.label = label;
  }
  if (raw.sort_order !== undefined) {
    if (
      typeof raw.sort_order !== "number" ||
      !Number.isFinite(raw.sort_order)
    ) {
      throw new Error("site.doc_category_body_invalid");
    }
    out.sort_order = Math.trunc(raw.sort_order);
  }
  return out;
}

/** 从显示名生成 key；中文等剥空时用短 hash，避免碰撞。 */
export function categoryKeyFromLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 63)
    .replace(/-+$/gu, "");
  if (slug && CATEGORY_KEY_RE.test(slug)) return slug;
  let hash = 0;
  for (const ch of label.trim()) {
    hash = (Math.imul(31, hash) + ch.codePointAt(0)!) | 0;
  }
  return `cat-${(hash >>> 0).toString(36)}`;
}

export function resolveCategoryLabel(
  label: string | LocalizedText,
  locale: string,
  defaultLocale: string,
): string {
  return localizeSiteText(label, locale, defaultLocale);
}

/** 已知默认产品站分类的 i18n 表（usage docs seed 用）。 */
export function defaultCategoryLabel(key: string): LocalizedText | null {
  const table = DEFAULT_DOC_CATEGORY_LABELS[key];
  if (!table) return null;
  return { __i18n: { ...table } };
}

export function categoryOptions(
  categories: readonly SiteDocCategory[],
  locale: AppLocale,
  defaultLocale: AppLocale,
): Array<{ key: string; label: string }> {
  return categories.map((category) => ({
    key: category.key,
    label: resolveCategoryLabel(category.label, locale, defaultLocale),
  }));
}

/** 从公开文档目录推导下拉选项（编辑器预览还没拉分类表时的兜底）。 */
export function docCategorySelectOptions(
  docs: readonly { category: string; category_label?: string }[],
): Array<{ key: string; label: string }> {
  const map = new Map<string, string>();
  for (const doc of docs) {
    if (!doc.category || map.has(doc.category)) continue;
    map.set(doc.category, doc.category_label?.trim() || doc.category);
  }
  return [...map].map(([key, label]) => ({ key, label }));
}

export function categoryLabelMap(
  categories: readonly SiteDocCategory[],
  locale: AppLocale,
  defaultLocale: AppLocale,
): Map<string, string> {
  return new Map(
    categoryOptions(categories, locale, defaultLocale).map((item) => [
      item.key,
      item.label,
    ]),
  );
}
