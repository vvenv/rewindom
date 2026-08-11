import { FOOTER_CHROME_BLOCKS } from "../_common/chrome-blocks.js";
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
