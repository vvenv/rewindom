import {
  Columns2,
  FileText,
  Globe,
  Heading1,
  LayoutList,
  LayoutPanelTop,
  LibraryBig,
  Link2,
  List,
  ListTree,
  Megaphone,
  Moon,
  PanelBottom,
  PanelTop,
  RectangleVertical,
  Search,
  Text,
  TextCursorInput,
  TriangleAlert,
  User,
  type LucideIcon,
} from "lucide-react";

import type { SectionType } from "../../../shared/section-schema.js";

/**
 * 图标是纯展示层关注点，不进 shared schema。
 *
 * 内置段写在这里；贡献段经 `registerSectionIcon`（由 `registerSiteSectionView`
 * 的 `icon` 选项触发）填进来——marketing 不该硬编码业务模块的 type。
 */
export const SECTION_ICONS: Partial<Record<SectionType, LucideIcon>> = {
  header: PanelTop,
  footer: PanelBottom,
  "page-header": Heading1,
  hero: LayoutPanelTop,
  "page-menu": LayoutList,
  form: TextCursorInput,
  prose: Text,
  "doc-list": LibraryBig,
  "doc-article": FileText,
  "doc-nav": ListTree,
  "doc-toc": List,
  group: Columns2,
  band: Megaphone,
  // 这份代码不认识的段：树上要看得见、能选中、能删，所以给它一个明确的警示图标
  unsupported: TriangleAlert,
};

/** 贡献段登记左侧树图标；同 type 覆盖。 */
export function registerSectionIcon(
  type: SectionType,
  icon: LucideIcon,
): void {
  SECTION_ICONS[type] = icon;
}

export const BLOCK_ICONS: Record<string, LucideIcon> = {
  column: RectangleVertical,
  field: TextCursorInput,
  nav_link: Link2,
  footer_link: Link2,
  chrome_brand: PanelTop,
  chrome_nav: LayoutList,
  chrome_button: Link2,
  chrome_doc_search: Search,
  chrome_locale: Globe,
  chrome_theme: Moon,
  chrome_account: User,
  chrome_copyright: Text,
  menu_column: Columns2,
};
