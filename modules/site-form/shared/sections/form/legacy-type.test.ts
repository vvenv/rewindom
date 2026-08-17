/**
 * 存量正文里的裸 `form`。
 *
 * 拆分前段 type 没有模块前缀，租户库里存的就是它。改名靠 marketing 解析层的
 * `SECTION_TYPE_ALIASES` 一次改写——这条断言守的是「升级当天已发布的表单不会变成
 * `unsupported` 占位」，而那正是唯一会在访客面前出事的路径。
 */

import {
  parseSections,
  registerSectionDefinition,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { describe, expect, it } from "vitest";

import { formSection, SITE_FORM_SECTION_TYPE } from "./definition.js";
import { renderFormHtml } from "./html.js";

registerSectionDefinition(formSection);

describe("存量段 type", () => {
  const stored = [
    {
      id: "sec-1",
      type: "form",
      settings: { submit_label: "发送" },
      blocks: [
        {
          id: "name",
          type: "field",
          settings: { label: "姓名", type: "text" },
        },
      ],
    },
  ];

  it("裸 `form` 解析成 site-form.form，字段与设置都留着", () => {
    const [section] = parseSections(stored);
    expect(section?.type).toBe(SITE_FORM_SECTION_TYPE);
    expect(section?.blocks).toHaveLength(1);
    expect(section?.blocks[0]?.type).toBe("field");
  });

  it("解析出来的段照常渲染，不会退化成 unsupported 占位", () => {
    const [section] = parseSections(stored);
    const html = renderFormHtml(section!, {});
    expect(html).toContain('class="site-form"');
    expect(html).toContain('name="name"');
    expect(html).toContain("发送");
  });
});
