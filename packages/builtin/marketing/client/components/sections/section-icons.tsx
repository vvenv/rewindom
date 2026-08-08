import {
  Blocks,
  Bot,
  Boxes,
  Globe,
  Layers,
  LineChart,
  Lock,
  Plug,
  Puzzle,
  Rocket,
  Server,
  Shield,
  Sparkles,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { SectionIconName } from "../../../shared/section-schema.js";

/** schema 里存 lucide 组件名，这里做名字 → 组件的映射（白名单由 schema 保证）。 */
export const SECTION_ICON_COMPONENTS: Record<SectionIconName, LucideIcon> = {
  Sparkles,
  Bot,
  Layers,
  Blocks,
  Plug,
  Shield,
  Server,
  Rocket,
  Zap,
  Globe,
  Lock,
  Users,
  LineChart,
  Puzzle,
  Workflow,
  Boxes,
};
