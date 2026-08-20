import { type ReactElement } from "react";

import {
  Blocks,
  Bot,
  Boxes,
  Download,
  ExternalLink,
  Globe,
  Heart,
  Layers,
  LineChart,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Plug,
  Puzzle,
  Rocket,
  Rss,
  Search,
  Send,
  Server,
  Share2,
  Shield,
  Sparkles,
  Star,
  Users,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { BRAND_ICON_SVG } from "../../../shared/brand-icons.js";

import type {
  BrandIconName,
  ResolvedSectionIcon,
  SectionIconName,
} from "../../../shared/section-schema.js";

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
  Mail,
  Rss,
  Phone,
  Search,
  MessageCircle,
  Send,
  ExternalLink,
  Download,
  Share2,
  Heart,
  Star,
};

export function BrandIconMark({
  name,
  size = 16,
}: {
  name: BrandIconName;
  size?: number;
}): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: BRAND_ICON_SVG[name] }}
    />
  );
}

/** 编辑器预览与段视图共用：lucide / 社交品牌 / 上传图。 */
export function SettingIconMark({
  icon,
  size = 16,
}: {
  icon: ResolvedSectionIcon;
  size?: number;
}): ReactElement {
  if (icon.kind === "image") {
    return (
      <img
        src={icon.url}
        alt=""
        width={size}
        height={size}
        aria-hidden="true"
      />
    );
  }
  if (icon.kind === "brand") {
    return <BrandIconMark name={icon.name} size={size} />;
  }
  const Icon = SECTION_ICON_COMPONENTS[icon.name];
  return <Icon size={size} aria-hidden="true" />;
}
