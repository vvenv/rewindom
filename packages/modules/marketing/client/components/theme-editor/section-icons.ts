import {
  BarChart3,
  CircleHelp,
  Columns2,
  Grid2x2,
  Layout,
  LayoutPanelTop,
  Link2,
  ListOrdered,
  Megaphone,
  PanelBottom,
  PanelTop,
  RectangleHorizontal,
  Rows3,
  Sparkles,
  Table2,
  Tag,
  Text,
  type LucideIcon,
} from "lucide-react";

import type { SectionType } from "../../../shared/section-schema.js";

/** 图标是纯展示层关注点，不进 shared schema。 */
export const SECTION_ICONS: Record<SectionType, LucideIcon> = {
  header: PanelTop,
  footer: PanelBottom,
  hero: LayoutPanelTop,
  "feature-grid": Grid2x2,
  steps: ListOrdered,
  "spec-list": Table2,
  cards: Layout,
  pricing: Tag,
  faq: CircleHelp,
  prose: Text,
  split: Columns2,
  band: Megaphone,
};

export const BLOCK_ICONS: Record<string, LucideIcon> = {
  card: RectangleHorizontal,
  stat: BarChart3,
  feature: Sparkles,
  step: ListOrdered,
  row: Rows3,
  plan: Tag,
  qa: CircleHelp,
  nav_link: Link2,
  footer_link: Link2,
};
