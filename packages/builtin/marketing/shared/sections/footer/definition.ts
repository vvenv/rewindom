import {
  FOOTER_CHROME_BLOCKS,
  FOOTER_MENU_COLUMN_BLOCK,
} from "../_common/chrome-blocks.js";
import { styleSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const footerSection: SectionDefinition = {
  type: "footer",
  label: "editor.sectionType.footer",
  placements: ["footer"],
  preset_blocks: [{ type: "chrome_copyright" }],
  max_blocks: 8,
  blocks: FOOTER_CHROME_BLOCKS,
  settings: [...styleSettings()],
};

/** @deprecated 仅 re-export，定义已迁入 chrome-blocks。 */
export { FOOTER_MENU_COLUMN_BLOCK };
