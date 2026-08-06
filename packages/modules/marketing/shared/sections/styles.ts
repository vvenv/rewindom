/**
 * 各 section 的 stylesheet 聚合顺序（与 `SECTION_DEFINITIONS` 登记顺序对齐）。
 * 加一段：新建 `sections/<type>/styles.ts`，并在本数组多一行。
 */

import { bandStyles } from "./band/styles.js";
import { cardsStyles } from "./cards/styles.js";
import { faqStyles } from "./faq/styles.js";
import { featureGridStyles } from "./feature-grid/styles.js";
import { footerStyles } from "./footer/styles.js";
import { formStyles } from "./form/styles.js";
import { groupStyles } from "./group/styles.js";
import { headerStyles } from "./header/styles.js";
import { heroStyles } from "./hero/styles.js";
import { pageHeaderStyles } from "./page-header/styles.js";
import { pageMenuStyles } from "./page-menu/styles.js";
import { pricingStyles } from "./pricing/styles.js";
import { proseStyles } from "./prose/styles.js";
import { specListStyles } from "./spec-list/styles.js";
import { stepsStyles } from "./steps/styles.js";
import type { SectionType } from "./types.js";
import { unsupportedStyles } from "./unsupported/styles.js";

/** 每个已注册 SectionType → stylesheet（可为空串）。 */
export const SECTION_STYLES_BY_TYPE: Record<SectionType, string> = {
  header: headerStyles,
  footer: footerStyles,
  "page-header": pageHeaderStyles,
  hero: heroStyles,
  "feature-grid": featureGridStyles,
  steps: stepsStyles,
  "spec-list": specListStyles,
  cards: cardsStyles,
  "page-menu": pageMenuStyles,
  pricing: pricingStyles,
  faq: faqStyles,
  form: formStyles,
  prose: proseStyles,
  group: groupStyles,
  band: bandStyles,
  unsupported: unsupportedStyles,
};

/** 注入顺序固定，保证级联可预测。 */
export const SECTION_STYLES: string[] = [
  headerStyles,
  footerStyles,
  pageHeaderStyles,
  heroStyles,
  featureGridStyles,
  stepsStyles,
  specListStyles,
  cardsStyles,
  pageMenuStyles,
  pricingStyles,
  faqStyles,
  formStyles,
  proseStyles,
  groupStyles,
  bandStyles,
  unsupportedStyles,
];
