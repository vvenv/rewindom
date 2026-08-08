/**
 * 租户文档库的类型与校验（写入路径与 UI 共用）。
 *
 * 与 `MarketingPage`（页面版式系统）解耦：文档就是「标题 + Markdown 正文 + 分类」，
 * 不进 section / block 体系。每租户默认有 `/docs`（索引）与 `/docs/:slug`（详情）
 * 路由，渲染复用站点 chrome + `.prose` 排版（见 `marketing-doc.service.ts`）。
 *
 * 与平台文档（`docs/*.md`，代码版本化）的区别：平台文档跟代码走、给默认租户产品
 * 站用；本表是租户自管、DB 存储、按租户隔离。
 *
 * draft / live 语义与 `MarketingPage` 同口径：无后缀是线上（访客看到的），`_draft`
 * 是编辑器在改的那一份。`status=draft` 时文档对访客不可见（不出现在 `/docs`）。
 */

import { isAppLocale, type AppLocale } from "@be-water/shared";

export type MarketingDocStatus = "draft" | "published";

/** 单段 slug：字母数字开头结尾，中间可含连字符，最长 63。 */
const DOC_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;

export interface MarketingDoc {
  id: string;
  tenant_id: string;
  slug: string;
  locale: AppLocale;
  // 线上（已发布）正文——访客看到的
  title: string;
  description: string;
  body_md: string;
  category: string;
  sort_order: number;
  status: MarketingDocStatus;
  // 编辑器草稿（发布时复制到无后缀列）
  title_draft: string;
  description_draft: string;
  body_md_draft: string;
  category_draft: string;
  sort_order_draft: number;
  /** 草稿是否与线上一致（仅 `published` 文档有意义）。 */
  content_dirty: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketingDocListItem {
  id: string;
  slug: string;
  locale: AppLocale;
  title: string;
  description: string;
  category: string;
  status: MarketingDocStatus;
  content_dirty: boolean;
  sort_order: number;
  updated_at: string;
}

export interface CreateMarketingDocBody {
  slug: string;
  title: string;
  description?: string;
  body_md?: string;
  category?: string;
  sort_order?: number;
}

export interface UpdateMarketingDocBody {
  slug?: string;
  title?: string;
  description?: string;
  body_md?: string;
  category?: string;
  sort_order?: number;
}

/** 归一化并校验文档 slug（单段，与页面 slug 的多段语义不同）。 */
export function validateDocSlug(value: unknown): string {
  if (typeof value !== "string") throw new Error("site.doc_slug_invalid");
  const normalized = value.trim().toLowerCase();
  if (!DOC_SLUG_RE.test(normalized)) {
    throw new Error("site.doc_slug_invalid");
  }
  return normalized;
}

export function validateDocLocale(value: unknown): AppLocale {
  const trimmed = (typeof value === "string" ? value : "").trim();
  if (!isAppLocale(trimmed)) throw new Error("site.locale_invalid");
  return trimmed;
}

/** 限制正文长度，挡住无意中传进来的超大 payload；正常文档远不到这个量。 */
const MAX_BODY_LENGTH = 200_000;

function trimString(value: unknown, max: number): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("site.doc_body_invalid");
  const trimmed = value.trim();
  if (trimmed.length > max) throw new Error("site.doc_body_invalid");
  return trimmed;
}

export function parseCreateDocBody(value: unknown): {
  slug: string;
  title: string;
  description: string;
  body_md: string;
  category: string;
  sort_order: number;
} {
  if (!value || typeof value !== "object") {
    throw new Error("site.doc_body_invalid");
  }
  const raw = value as Record<string, unknown>;
  const slug = validateDocSlug(raw.slug);
  const title = trimString(raw.title, 200);
  if (!title) throw new Error("site.doc_title_required");
  return {
    slug,
    title,
    description: trimString(raw.description, 500),
    body_md: trimString(raw.body_md, MAX_BODY_LENGTH),
    category: trimString(raw.category, 100),
    sort_order:
      typeof raw.sort_order === "number" && Number.isFinite(raw.sort_order)
        ? Math.trunc(raw.sort_order)
        : 0,
  };
}

export function parseUpdateDocBody(value: unknown): {
  slug?: string;
  title?: string;
  description?: string;
  body_md?: string;
  category?: string;
  sort_order?: number;
} {
  if (!value || typeof value !== "object") {
    throw new Error("site.doc_body_invalid");
  }
  const raw = value as Record<string, unknown>;
  const out: {
    slug?: string;
    title?: string;
    description?: string;
    body_md?: string;
    category?: string;
    sort_order?: number;
  } = {};
  if (raw.slug !== undefined) out.slug = validateDocSlug(raw.slug);
  if (raw.title !== undefined) {
    const title = trimString(raw.title, 200);
    if (!title) throw new Error("site.doc_title_required");
    out.title = title;
  }
  if (raw.description !== undefined)
    out.description = trimString(raw.description, 500);
  if (raw.body_md !== undefined)
    out.body_md = trimString(raw.body_md, MAX_BODY_LENGTH);
  if (raw.category !== undefined) out.category = trimString(raw.category, 100);
  if (raw.sort_order !== undefined) {
    if (
      typeof raw.sort_order !== "number" ||
      !Number.isFinite(raw.sort_order)
    ) {
      throw new Error("site.doc_body_invalid");
    }
    out.sort_order = Math.trunc(raw.sort_order);
  }
  return out;
}

/**
 * 解析一篇 `.md` 文件内容为文档字段（导入用）。
 *
 * 与平台文档的 `assemble-docs.mjs` 同口径：frontmatter 的 `title` / `description`
 * / `category`，正文是 frontmatter 之后的全部内容。文件名即 slug（去掉 `.md`）。
 */
export interface ParsedMarkdownFile {
  slug: string;
  title: string;
  description: string;
  category: string;
  body_md: string;
}

export function parseMarkdownFile(
  filename: string,
  raw: string,
): ParsedMarkdownFile {
  const baseName = filename.replace(/\.md$/iu, "").replace(/[/\\]/gu, "");
  const slug = validateDocSlug(baseName);

  let title = slug;
  let description = "";
  let category = "";
  let body = raw;
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u);
  if (fmMatch) {
    body = raw.slice(fmMatch[0].length);
    for (const line of fmMatch[1]!.split(/\r?\n/u)) {
      const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/u);
      if (!m) continue;
      const key = m[1]!;
      const val = m[2]!.trim();
      if (key === "title") title = val;
      else if (key === "description") description = val;
      else if (key === "category") category = val;
    }
  }
  const trimmedBody = body.trim();
  if (trimmedBody.length > MAX_BODY_LENGTH) {
    throw new Error("site.doc_body_invalid");
  }
  return {
    slug,
    title: title.slice(0, 200) || slug,
    description: description.slice(0, 500),
    category: category.slice(0, 100),
    body_md: trimmedBody,
  };
}

/** 导出时把文档拼回带 frontmatter 的 `.md` 文本。 */
export function formatDocAsMarkdown(doc: {
  slug: string;
  title: string;
  description: string;
  category: string;
  body_md: string;
}): string {
  const fm: string[] = ["---", `title: ${doc.title}`, `slug: ${doc.slug}`];
  if (doc.description) fm.push(`description: ${doc.description}`);
  if (doc.category) fm.push(`category: ${doc.category}`);
  fm.push("---", "");
  return `${fm.join("\n")}\n${doc.body_md}\n`;
}
