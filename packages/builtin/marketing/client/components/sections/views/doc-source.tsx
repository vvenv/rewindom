import { type ReactElement } from "react";

import { getPlatformDoc } from "../../../../docs/index.js";
import { settingText } from "../../../../shared/section-schema.js";
import { MarkdownBlock, type SectionViewProps } from "../section-parts.js";

/**
 * doc-source 的客户端视图：从平台文档注册表查 markdown，用 MarkdownProse 渲染。
 *
 * 与 prose 的区别：内容不在 section settings 里，而在 docs/ 注册表中——
 * 平台文档跟代码版本走，租户不可编辑正文。
 */
export function DocSourceSection({
  section,
}: SectionViewProps): ReactElement | null {
  const slug = settingText(section.settings, "doc_slug");
  const doc = getPlatformDoc(slug);
  if (!doc) return null;
  return <MarkdownBlock body_md={doc.markdown} />;
}
