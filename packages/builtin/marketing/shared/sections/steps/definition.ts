import { headingSettings, layoutSettings } from "../_common/settings.js";

import type { SectionDefinition } from "../types.js";

/** 有先后的流程：编号 + 标题 + 说明。 */
export const stepsSection: SectionDefinition = {
  type: "steps",
  label: "editor.sectionType.steps",
  placements: ["page"],
  settings: [
    ...headingSettings({
      headingDefault: "marketing:storefront.steps.heading",
    }),
    {
      type: "checkbox",
      id: "show_number",
      label: "editor.setting.show_number",
      default: true,
    },
    ...layoutSettings({ padding_top: 48, padding_bottom: 48 }),
  ],
  max_blocks: 6,
  preset_blocks: [{ type: "step" }, { type: "step" }, { type: "step" }],
  blocks: [
    {
      type: "step",
      label: "editor.blockType.step",
      settings: [
        {
          type: "text",
          id: "title",
          label: "editor.setting.title",
          default: "marketing:storefront.steps.itemTitle",
          required: true,
        },
        {
          type: "textarea",
          id: "body",
          label: "editor.setting.body",
          rows: 3,
          default: "marketing:storefront.steps.itemBody",
        },
      ],
    },
  ],
};
