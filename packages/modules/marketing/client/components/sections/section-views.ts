/**
 * 段 type → React 视图的一张表。
 *
 * 以前这里是 `SiteSections.tsx` 里的一个 `switch`，各段的 JSX 全挤在同一个文件里、
 * 与它们的 schema 和 SSR 渲染各隔一个包。现在一段的三处实现分别是
 * `views/<type>.tsx`、`shared/sections/<type>/definition.ts`、`shared/sections/<type>/html.ts`。
 *
 * `header` / `footer` 不在表内：它们是站点级 chrome，由 `SiteChrome.tsx` 渲染，不进段流。
 */

import type { ComponentType } from "react";

import { BandSection } from "./views/band.js";
import { CardsSection } from "./views/cards.js";
import { FaqSection } from "./views/faq.js";
import { FeatureGridSection } from "./views/feature-grid.js";
import { FormSection } from "./views/form.js";
import { GroupSection } from "./views/group.js";
import { HeroSection } from "./views/hero.js";
import { PageHeaderSection } from "./views/page-header.js";
import { PageMenuSection } from "./views/page-menu.js";
import { PricingSection } from "./views/pricing.js";
import { ProseSection } from "./views/prose.js";
import { SpecListSection } from "./views/spec-list.js";
import { StepsSection } from "./views/steps.js";

import type { SectionViewProps } from "./section-parts.js";
import type { SectionType } from "../../../shared/section-schema.js";

export const SECTION_VIEWS: Partial<
  Record<SectionType, ComponentType<SectionViewProps>>
> = {
  hero: HeroSection,
  "feature-grid": FeatureGridSection,
  steps: StepsSection,
  "spec-list": SpecListSection,
  cards: CardsSection,
  "page-menu": PageMenuSection,
  pricing: PricingSection,
  faq: FaqSection,
  form: FormSection,
  band: BandSection,
  group: GroupSection,
  "page-header": PageHeaderSection,
  prose: ProseSection,
};
