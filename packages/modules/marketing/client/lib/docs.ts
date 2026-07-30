import { parseFrontmatter } from "./frontmatter.js";

export interface DocPage {
  /** URL 片段，来自 frontmatter 的 `slug` */
  slug: string;
  title: string;
  description: string;
  /** 去掉 frontmatter 的 markdown 正文 */
  body: string;
  /** 侧边目录顺序，取自文件名数字前缀 */
  order: number;
  /** 完整路由路径 */
  path: string;
}

/** 文件名前缀（`01-quickstart.md`）即目录顺序；缺前缀的排到最后。 */
function readOrder(filePath: string): number {
  const fileName = filePath.split("/").pop() ?? filePath;
  const prefix = /^(\d+)[-_]/u.exec(fileName);
  return prefix ? Number(prefix[1]) : Number.MAX_SAFE_INTEGER;
}

function readFallbackSlug(filePath: string): string {
  const fileName = filePath.split("/").pop() ?? filePath;
  return fileName.replace(/^\d+[-_]/u, "").replace(/\.md$/u, "");
}

/**
 * 把 `路径 → 原文` 映射整理成有序文档列表。
 *
 * 独立于 `import.meta.glob` 以便单测直接喂假数据。缺 title/description 的文档
 * 会**抛错**而不是给个空标题——那两项直接进 `<title>` 和 meta description，
 * 静默留空等于把一个 SEO 事故带上线。
 */
export function buildDocPages(files: Record<string, string>): DocPage[] {
  const pages = Object.entries(files).map(([filePath, raw]) => {
    const { data, body } = parseFrontmatter(raw);
    const slug = data.slug ?? readFallbackSlug(filePath);

    if (!data.title || !data.description) {
      throw new Error(
        `文档 ${filePath} 缺少 frontmatter 的 title 或 description——两者都会进 <head>，不能为空`,
      );
    }

    return {
      slug,
      title: data.title,
      description: data.description,
      body,
      order: readOrder(filePath),
      path: `/docs/${slug}`,
    } satisfies DocPage;
  });

  const duplicated = pages
    .map((page) => page.slug)
    .filter((slug, index, all) => all.indexOf(slug) !== index);
  if (duplicated.length > 0) {
    throw new Error(`文档 slug 重复：${[...new Set(duplicated)].join(", ")}`);
  }

  return pages.sort(
    (left, right) =>
      left.order - right.order || left.slug.localeCompare(right.slug),
  );
}

/**
 * 构建期把 `content/docs/*.md` 内联进产物：官网要能被爬虫抓到全文，
 * 不能在浏览器里再去 fetch 一遍 markdown。
 */
const DOC_FILES = import.meta.glob("../../content/docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const DOC_PAGES: readonly DocPage[] = buildDocPages(DOC_FILES);

export function findDocPage(slug: string | undefined): DocPage | undefined {
  return DOC_PAGES.find((page) => page.slug === slug);
}
