/**
 * 字段模型与校验 —— 服务端拿它当验收标准，所以这里守的是「能不能绕过去」。
 */

import { describe, expect, it } from "vitest";

import {
  composeBriefText,
  normalizeBriefEntries,
  normalizeSamples,
  normalizeTemplateFields,
  validateBriefValues,
  CONTENT_TEMPLATE_SAMPLES_MAX,
  type ContentTemplateField,
} from "./content-template.js";

function fieldsFrom(
  raw: Array<Record<string, unknown>>,
): ContentTemplateField[] {
  return normalizeTemplateFields(
    raw.map((item, index) => ({
      id: `f${index}`,
      label: `字段${index}`,
      ...item,
    })),
  );
}

describe("normalizeTemplateFields", () => {
  it("不认识的类型退回单行文本，而不是让整个模板加载不出来", () => {
    const [field] = fieldsFrom([{ type: "signature" }]);
    expect(field!.type).toBe("text");
  });

  it("只有下拉才留可选项", () => {
    const fields = fieldsFrom([
      { type: "select", options: ["A", "B"] },
      { type: "text", options: ["A", "B"] },
    ]);
    expect(fields[0]!.options).toEqual(["A", "B"]);
    expect(fields[1]!.options).toEqual([]);
  });

  it("没有 id 或标签的条目直接丢掉，重复 id 只留第一条", () => {
    expect(
      normalizeTemplateFields([
        { id: "", label: "无 id" },
        { id: "a", label: "" },
        { id: "b", label: "留下" },
        { id: "b", label: "重复" },
      ]).map((field) => field.label),
    ).toEqual(["留下"]);
  });
});

describe("validateBriefValues", () => {
  it("必填为空 → 报错；选填为空 → 放行且不入库", () => {
    const fields = fieldsFrom([{ required: true }, { required: false }]);
    expect(validateBriefValues(fields, { f0: "", f1: "" })).toEqual({
      ok: false,
      errors: { f0: "content.field.required" },
    });

    const passed = validateBriefValues(fields, { f0: "有值", f1: "" });
    expect(passed.ok).toBe(true);
    // 空的选填字段不该在详情页留一行没内容的标签
    expect(passed.ok && passed.entries).toEqual([
      { id: "f0", label: "字段0", value: "有值" },
    ]);
  });

  it("一次把所有错都给出来，不是一个个挤", () => {
    const fields = fieldsFrom([
      { required: true },
      { type: "select", options: ["A"] },
    ]);
    const result = validateBriefValues(fields, { f0: "", f1: "B" });
    expect(result.ok).toBe(false);
    expect(result.ok === false && Object.keys(result.errors)).toEqual([
      "f0",
      "f1",
    ]);
  });

  it("下拉只收它自己列出来的值——绕过表单构造请求过不来", () => {
    const fields = fieldsFrom([{ type: "select", options: ["A", "B"] }]);
    expect(validateBriefValues(fields, { f0: "C" })).toEqual({
      ok: false,
      errors: { f0: "content.field.option" },
    });
  });

  it("模板里没有的字段一律不入库", () => {
    const fields = fieldsFrom([{}]);
    const result = validateBriefValues(fields, { f0: "有值", 别的: "夹带" });
    expect(result.ok && result.entries.map((entry) => entry.id)).toEqual([
      "f0",
    ]);
  });
});

describe("normalizeBriefEntries", () => {
  it("读回来的是自描述的三元组，空值不留", () => {
    expect(
      normalizeBriefEntries([
        { id: "a", label: "标签", value: "值" },
        { id: "b", label: "空的", value: "  " },
        "不是对象",
      ]),
    ).toEqual([{ id: "a", label: "标签", value: "值" }]);
  });
});

describe("normalizeSamples", () => {
  it("范文有数量上限——不设限的话 token 成本由平台吃", () => {
    const samples = normalizeSamples(
      Array.from({ length: 10 }, (_, index) => ({ body: `范文${index}` })),
    );
    expect(samples).toHaveLength(CONTENT_TEMPLATE_SAMPLES_MAX);
  });
});

describe("composeBriefText", () => {
  it("拼成带标签的纯文本，供列表搜索用", () => {
    expect(
      composeBriefText([
        { id: "a", label: "写什么", value: "三明治" },
        { id: "b", label: "", value: "没有标签" },
      ]),
    ).toBe("写什么：三明治\n没有标签");
  });
});
