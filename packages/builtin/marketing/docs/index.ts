/**
 * 平台文档注册表。
 *
 * 平台文档跟代码版本走，打包进 bundle。SSR 和客户端都直接 import 本模块，
 * 不需要文件系统访问或 API 端点。
 *
 * 新增文档：在 docs/ 下创建 <slug>.ts 导出 markdown 字符串，然后在这里登记。
 */
import { INSTALL_EXTERNAL_MODULE_MD } from "./install-external-module.js";

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

export const PLATFORM_DOCS: readonly PlatformDoc[] = [
  {
    slug: "install-external-module",
    title: "安装外部模块",
    description: "外部模块的目录结构、边界规则与接入流程",
    markdown: INSTALL_EXTERNAL_MODULE_MD,
  },
];

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
