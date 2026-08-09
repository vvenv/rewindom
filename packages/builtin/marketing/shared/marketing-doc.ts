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
 * frontmatter 的 `title` / `description` / `category`，正文是 frontmatter 之后的
 * 全部内容。文件名即 slug（去掉 `.md`）。
 */
export interface ParsedMarkdownFile {
  slug: string;
  title: string;
  description: string;
  category: string;
  sort_order: number;
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
  let sort_order = 0;
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
      else if (key === "sort_order") {
        const n = Number(val);
        if (Number.isFinite(n)) sort_order = Math.trunc(n);
      }
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
    sort_order,
    body_md: trimmedBody,
  };
}

/* -------------------------------------------------------------------------- */
/* 公开面：doc-* 段的数据形状与派生                                            */
/* -------------------------------------------------------------------------- */

/**
 * 文档索引的逻辑路径（不带 locale 前缀）。
 *
 * 固定值：`RESERVED_PAGE_SLUGS` 为它占着 `docs` 这个一级 slug，路由也按这个前缀
 * 拦截（见 `server/ssr.routes.ts`）。要改成可配置，那三处得一起动。
 */
export const DOCS_INDEX_PATH = "/docs";

/** 单篇文档的逻辑路径。 */
export function docPath(slug: string): string {
  return `${DOCS_INDEX_PATH}/${slug}`;
}

/**
 * 文档库的界面文案。
 *
 * 文档正文是租户自己写的、不需要翻译，但外框上这几个词（「更新于」「返回文档」）
 * 是**产品**的一部分，得跟着访客语言走。与 `sections/header/messages.ts` 同一手法：
 * 两三个词不值得拉一整套 i18n 运行时进 SSR。
 */
export function docMessages(locale: string): {
  updated: string;
  back: string;
  toc: string;
  nav: string;
  search: string;
  searchNoResults: string;
} {
  return locale.startsWith("zh")
    ? {
        updated: "更新于",
        back: "返回文档",
        toc: "本页内容",
        nav: "文档",
        search: "搜索文档",
        searchNoResults: "没有匹配的文档",
      }
    : {
        updated: "Updated",
        back: "Back to docs",
        toc: "On this page",
        nav: "Docs",
        search: "Search docs",
        searchNoResults: "No matching docs",
      };
}

/** 更新时间的展示形态；脏值退回 ISO 的日期部分，不因为一条坏时间戳炸掉整页。 */
export function formatDocDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(
      locale.startsWith("zh") ? "zh-CN" : "en-US",
      { year: "numeric", month: "short", day: "numeric" },
    );
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * 公开面的文档目录条目（不含正文）。
 *
 * `doc-list` / `doc-nav` 只需要这些字段——列表页不该把每篇的 `body_md` 都拖进内存，
 * 一个租户几百篇文档时那是几 MB 的无用 payload。
 */
export interface PublicDocSummary {
  slug: string;
  title: string;
  description: string;
  category: string;
  sort_order: number;
  updated_at: string;
}

/** 公开面的单篇文档（详情模板页渲染 `doc-article` / `doc-toc` 用）。 */
export interface PublicDocDetail extends PublicDocSummary {
  body_md: string;
}

/**
 * 按分类分组，**保持传入顺序**（服务端已按 category / sort_order / title 排好）。
 *
 * 没填分类的收在**最后一组**且 `category` 为空串——这一组是「散条目」，不是一个
 * 叫「其它」的分类：目录里凭空多出一个谁都没建过的分类名，比几条没有归属的文档
 * 更让人困惑，而各处渲染看到空标题就直接把条目铺在顶层（见 `doc-nav` / `doc-list`）。
 * 恒排最后是因为分类过的那些才是目录的骨架，散条目挂在骨架后面。
 */
export function groupDocsByCategory<T extends { category: string }>(
  docs: readonly T[],
): Array<{ category: string; items: T[] }> {
  const grouped = new Map<string, T[]>();
  const loose: T[] = [];
  for (const doc of docs) {
    if (!doc.category) {
      loose.push(doc);
      continue;
    }
    const list = grouped.get(doc.category);
    if (list) list.push(doc);
    else grouped.set(doc.category, [doc]);
  }
  const out = [...grouped].map(([category, items]) => ({ category, items }));
  if (loose.length > 0) out.push({ category: "", items: loose });
  return out;
}

/**
 * 现有分类名（去重、保持传入顺序，不含未分类）。
 *
 * 编辑器给 `doc_category` 菜单项当候选：那个字段是**逐字匹配** `MarketingDoc.category`
 * 的，打错一个字的表现是整条菜单项静默消失，不该靠租户自己去文档库抄。
 */
export function docCategories(
  docs: readonly { category: string }[],
): string[] {
  return [...new Set(docs.map((doc) => doc.category).filter(Boolean))];
}

/**
 * 标题文本 → 锚点 id。
 *
 * 两端 markdown 渲染共用这一个算法（SSR 的 `md()` 与客户端的 `MarkdownProse`），
 * 否则 `doc-toc` 生成的链接在其中一端点不动。刻意**不去重**：同名标题只锚到第一处，
 * 比两端各编一套 `-2` 后缀然后对不上要好。
 */
export function docHeadingAnchor(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      // 保留 CJK：中文标题占多数，剥成空串的话整份目录都没有锚点
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/gu, "-")
      .replace(/^-+|-+$/gu, "") || "section"
  );
}

export interface DocHeading {
  /**
   * **渲染后**的级别（2..6）。
   *
   * markdown 的 `#` 在两端都渲成 `<h2>`（正文外面已经有一个页面级 h1），所以这里
   * 也把 1 归到 2——目录的缩进层次要跟正文看起来的层次一致，不是跟源码写法一致。
   */
  level: number;
  text: string;
  anchor: string;
}

/**
 * 从 markdown 正文抽章节标题（`doc-toc` 的数据源）。
 *
 * 只认 ATX 标题（`##` 起），跳过正文 `#`（页面标题走元数据）与围栏代码块里的 `#`。
 */
export function extractDocHeadings(
  body_md: string,
  options: { min?: number; max?: number } = {},
): DocHeading[] {
  const min = options.min ?? 2;
  const max = options.max ?? 3;
  const out: DocHeading[] = [];
  let fence: string | null = null;
  for (const rawLine of body_md.split(/\r?\n/u)) {
    const line = rawLine.trimEnd();
    const fenceMatch = line.match(/^\s{0,3}(```+|~~~+)/u);
    if (fenceMatch) {
      const marker = fenceMatch[1]!;
      if (fence === null) fence = marker[0]!;
      else if (marker.startsWith(fence)) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*$/u);
    if (!match) continue;
    const depth = match[1]!.length;
    // 页面标题走 doc.title；正文里的 `#` 不进目录
    if (depth === 1) continue;
    const level = depth;
    if (level < min || level > max) continue;
    // 标题里的行内标记（`**粗**`、`` `code` ``、链接）不该进目录文本
    const text = match[2]!
      .replace(/\[([^\]]*)\]\([^)]*\)/gu, "$1")
      .replace(/[*_`]/gu, "")
      .trim();
    if (!text) continue;
    out.push({ level, text, anchor: docHeadingAnchor(text) });
  }
  return out;
}

/** 导出时把文档拼回带 frontmatter 的 `.md` 文本。 */
export function formatDocAsMarkdown(doc: {
  slug: string;
  title: string;
  description: string;
  category: string;
  sort_order?: number;
  body_md: string;
}): string {
  const fm: string[] = ["---", `title: ${doc.title}`, `slug: ${doc.slug}`];
  if (doc.description) fm.push(`description: ${doc.description}`);
  if (doc.category) fm.push(`category: ${doc.category}`);
  if (doc.sort_order !== undefined) fm.push(`sort_order: ${doc.sort_order}`);
  fm.push("---", "");
  return `${fm.join("\n")}\n${doc.body_md}\n`;
}
