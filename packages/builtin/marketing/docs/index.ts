/**
 * 平台文档注册表（类型化 API）。
 *
 * 平台文档跟代码版本走，打包进 bundle。SSR 和客户端都直接 import 本模块，
 * 不需要文件系统访问或 API 端点。
 *
 * 真源是同目录下的 `*.md`（filename = slug，frontmatter = title/description），
 * 由 `assemble-docs.mjs` 压进 `docs.generated.ts`。本文件只做类型化与派生，
 * 不含数据——加一篇文档丢个 `.md` 进来，跑 `pnpm --filter @be-water/builtin
 * assemble:marketing-docs` 即可，这里一行不改。
 *
 * 与租户文档库（`MarketingDoc`，DB 存储、按租户隔离）是两回事：平台文档是
 * 代码版本化、给默认租户产品站用的；租户文档库由各自管理台维护。
 */
import { PLATFORM_DOCS_RAW } from "./docs.generated.js";

export interface PlatformDoc {
  /** URL slug，用于 doc-source section 的 doc_slug 设置 */
  slug: string;
  /** 文档标题（显示在编辑器下拉和页面标题） */
  title: string;
  /** 文档简述（显示在编辑器下拉） */
  description: string;
  /** Markdown 正文 */
  markdown: string;
}

export const PLATFORM_DOCS: readonly PlatformDoc[] = PLATFORM_DOCS_RAW;

/** 查找一篇文档，找不到返回 undefined。 */
export function getPlatformDoc(slug: string): PlatformDoc | undefined {
  return PLATFORM_DOCS.find((doc) => doc.slug === slug);
}

/** 编辑器下拉选项：doc-source section 的 doc_slug 设置用。 */
export const PLATFORM_DOC_OPTIONS: readonly {
  value: string;
  label: string;
}[] = PLATFORM_DOCS.map((doc) => ({
  value: doc.slug,
  label: doc.title,
}));
