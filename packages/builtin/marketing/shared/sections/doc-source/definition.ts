import { PLATFORM_DOC_OPTIONS } from "../../../docs/index.js";
import { layoutSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/**
 * doc-source section：从平台文档注册表加载 markdown，渲染为正文。
 *
 * 与 prose 的区别：
 * - prose = 内联 markdown（内容存在 section settings 里，租户可编辑）
 * - doc-source = 引用平台文档（内容跟代码版本走，租户不可编辑正文，只可选哪篇）
 *
 * 平台文档（如安装指南）不应存在数据库里——它应该跟代码版本走。
 */
export const docSourceSection: SectionDefinition = {
  type: "doc-source",
  label: "editor.sectionType.doc-source",
  placements: ["page"],
  settings: [
    {
      type: "select",
      id: "doc_slug",
      label: "editor.setting.doc_slug",
      default: PLATFORM_DOC_OPTIONS[0]?.value ?? "",
      options: PLATFORM_DOC_OPTIONS,
    },
    ...layoutSettings(),
  ],
};
