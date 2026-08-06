import { styleSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const footerSection: SectionDefinition = {
  type: "footer",
  label: "editor.sectionType.footer",
  placements: ["footer"],
  settings: [
    {
      type: "checkbox",
      id: "show_logo",
      label: "editor.setting.show_logo",
      default: true,
    },
    {
      type: "textarea",
      id: "blurb",
      label: "editor.setting.blurb",
      rows: 2,
      info: "editor.info.footer_blurb",
    },
    {
      type: "text",
      id: "copyright",
      label: "editor.setting.copyright",
      info: "editor.info.copyright",
    },
    ...styleSettings(),
  ],
  max_blocks: 24,
  blocks: [
    {
      type: "footer_link",
      label: "editor.blockType.footer_link",
      settings: [
        {
          type: "text",
          id: "group",
          label: "editor.setting.group",
          info: "editor.info.footer_group",
        },
        {
          type: "text",
          id: "label",
          label: "editor.setting.label",
          default: "Link",
          required: true,
        },
        {
          type: "url",
          id: "href",
          label: "editor.setting.href",
          default: "/",
        },
      ],
    },
  ],
};
