import { settingText } from "../../section-schema.js";
import { md } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderProseHtml: SectionHtmlRenderer = (section) =>
  `<div class="prose">${md(settingText(section.settings, "body_md"))}</div>`;
