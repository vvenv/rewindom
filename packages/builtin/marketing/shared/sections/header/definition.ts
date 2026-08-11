import { HEADER_CHROME_BLOCKS } from "../_common/chrome-blocks.js";
import { styleSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const headerSection: SectionDefinition = {
  type: "header",
  label: "editor.sectionType.header",
  placements: ["header"],
  preset_blocks: [
    { type: "chrome_brand" },
    { type: "chrome_nav" },
  ],
  max_blocks: 12,
  blocks: HEADER_CHROME_BLOCKS,
  settings: [
    { type: "header", content: "editor.group.layout", group: "layout" },
    {
      type: "checkbox",
      id: "sticky",
      label: "editor.setting.sticky",
      default: true,
    },
    {
      type: "select",
      id: "layout",
      label: "editor.setting.header_layout",
      default: "split",
      options: [
        { value: "split", label: "editor.option.header_layout.split" },
        { value: "centered", label: "editor.option.header_layout.centered" },
      ],
      info: "editor.info.header_layout",
    },
    ...styleSettings(),
  ],
};
