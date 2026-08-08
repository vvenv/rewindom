import {
  headingSettings,
  layoutSettings,
  styleSettings,
} from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

export const faqSection: SectionDefinition = {
  type: "faq",
  label: "editor.sectionType.faq",
  placements: ["page"],
  settings: [...headingSettings(), ...layoutSettings()],
  max_blocks: 20,
  preset_blocks: [{ type: "qa" }, { type: "qa" }],
  blocks: [
    {
      type: "qa",
      label: "editor.blockType.qa",
      settings: [
        {
          type: "text",
          id: "question",
          label: "editor.setting.question",
          default: "Question",
          required: true,
        },
        {
          type: "textarea",
          id: "answer",
          label: "editor.setting.answer",
          rows: 4,
        },
        ...styleSettings(),
      ],
    },
  ],
};
