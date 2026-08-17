/**
 * 表单字段的校验 —— 服务端拿它当验收标准，所以这里守的是「能不能绕过去」。
 */

import { describe, expect, it } from "vitest";

import {
  createSection,
  registerSectionDefinition,
  type SiteSection,
} from "@rewindom/builtin/marketing/shared/section-schema.js";

import { formSection, SITE_FORM_SECTION_TYPE } from "./definition.js";
import { resolveFormFields, validateFormValues } from "./fields.js";

registerSectionDefinition(formSection);

/** 造一个只含指定字段的表单段。 */
function formWith(fields: Array<Record<string, unknown>>): SiteSection {
  const section = createSection(SITE_FORM_SECTION_TYPE);
  section.blocks = fields.map((settings, index) => ({
    id: `f${index}`,
    type: "field",
    settings: { label: `字段${index}`, type: "text", ...settings } as never,
  }));
  return section;
}

describe("resolveFormFields", () => {
  it("只认 `field` block，别的一概不当字段", () => {
    const section = formWith([{}]);
    section.blocks.push({ id: "x", type: "stat", settings: {} });
    expect(resolveFormFields(section).map((f) => f.id)).toEqual(["f0"]);
  });

  it("不认识的字段类型退回单行文本，而不是让整段渲染不出来", () => {
    const [field] = resolveFormFields(formWith([{ type: "signature" }]));
    expect(field!.type).toBe("text");
  });

  it("多行字段默认独占一行，不用租户自己勾", () => {
    const [field] = resolveFormFields(formWith([{ type: "textarea" }]));
    expect(field!.wide).toBe(true);
  });

  it("只有下拉才读可选项", () => {
    const fields = resolveFormFields(
      formWith([
        { type: "select", options: "A\nB" },
        { type: "text", options: "A\nB" },
      ]),
    );
    expect(fields[0]!.options).toEqual(["A", "B"]);
    expect(fields[1]!.options).toEqual([]);
  });
});

describe("validateFormValues", () => {
  it("必填为空 → 报错；选填为空 → 放行且不入库", () => {
    const fields = resolveFormFields(
      formWith([{ required: true }, { required: false }]),
    );
    expect(validateFormValues(fields, { f0: "", f1: "" })).toEqual({
      ok: false,
      errors: { f0: "site.form.required" },
    });

    const passed = validateFormValues(fields, { f0: "有值", f1: "" });
    expect(passed.ok).toBe(true);
    // 空的选填字段不该在后台列表里留一行空记录
    expect(passed.ok && passed.entries).toEqual([
      { id: "f0", label: "字段0", value: "有值" },
    ]);
  });

  it("一次把所有错都给出来，不是一个个挤", () => {
    const fields = resolveFormFields(
      formWith([{ required: true }, { type: "email" }]),
    );
    const result = validateFormValues(fields, { f0: "", f1: "不是邮箱" });
    expect(result.ok).toBe(false);
    expect(result.ok === false && Object.keys(result.errors)).toEqual([
      "f0",
      "f1",
    ]);
  });

  it("下拉只收它自己列出来的值——绕过表单构造请求过不来", () => {
    const fields = resolveFormFields(
      formWith([{ type: "select", options: "A\nB" }]),
    );
    expect(validateFormValues(fields, { f0: "A" }).ok).toBe(true);
    expect(validateFormValues(fields, { f0: "C" })).toEqual({
      ok: false,
      errors: { f0: "site.form.option" },
    });
  });

  it("超长内容拒收，别把表单当免费存储用", () => {
    const fields = resolveFormFields(formWith([{}, { type: "textarea" }]));
    const long = "x".repeat(201);
    expect(validateFormValues(fields, { f0: long }).ok).toBe(false);
    // 多行字段本来就该能写几段，上限单独放宽
    expect(validateFormValues(fields, { f1: long }).ok).toBe(true);
    expect(validateFormValues(fields, { f1: "x".repeat(4001) }).ok).toBe(false);
  });

  it("勾选框的必填 = 必须勾上（同意条款那种）", () => {
    const fields = resolveFormFields(
      formWith([{ type: "checkbox", required: true }]),
    );
    expect(validateFormValues(fields, { f0: false }).ok).toBe(false);
    expect(validateFormValues(fields, { f0: true }).ok).toBe(true);
  });

  it("客户端多送的字段一律忽略：字段表以段为准", () => {
    const fields = resolveFormFields(formWith([{}]));
    const result = validateFormValues(fields, { f0: "ok", injected: "坏东西" });
    expect(result.ok && result.entries.map((e) => e.id)).toEqual(["f0"]);
  });

  it("非字符串的值不会漏进库", () => {
    const fields = resolveFormFields(formWith([{}]));
    const result = validateFormValues(fields, { f0: { nested: "对象" } });
    // 归一化成空串 → 选填字段直接不入库
    expect(result.ok && result.entries).toEqual([]);
  });

  it("邮箱与电话只做形状校验，不强求具体写法", () => {
    const fields = resolveFormFields(
      formWith([{ type: "email" }, { type: "tel" }]),
    );
    expect(
      validateFormValues(fields, { f0: "a@b.co", f1: "+86 138 0000" }).ok,
    ).toBe(true);
    expect(validateFormValues(fields, { f0: "a@b" }).ok).toBe(false);
    expect(validateFormValues(fields, { f1: "abc" }).ok).toBe(false);
  });

  it("内置格式规则：通过/不通过各一条", () => {
    const cases: Array<{
      rule: string;
      pass: string;
      fail: string;
      code: string;
    }> = [
      {
        rule: "email",
        pass: "a@b.co",
        fail: "不是邮箱",
        code: "site.form.email",
      },
      { rule: "tel", pass: "+86 138 0000", fail: "abc", code: "site.form.tel" },
      {
        rule: "url",
        pass: "https://example.com",
        fail: "not a url",
        code: "site.form.url",
      },
      { rule: "number", pass: "-3.14", fail: "12a", code: "site.form.number" },
      { rule: "integer", pass: "42", fail: "3.5", code: "site.form.integer" },
      {
        rule: "id_card",
        pass: "11010119900307001X",
        fail: "12345",
        code: "site.form.id_card",
      },
      {
        rule: "postal_code",
        pass: "100000",
        fail: "12345",
        code: "site.form.postal_code",
      },
    ];
    for (const { rule, pass, fail, code } of cases) {
      const fields = resolveFormFields(formWith([{ validation: rule }]));
      expect(validateFormValues(fields, { f0: pass }).ok).toBe(true);
      expect(validateFormValues(fields, { f0: fail })).toEqual({
        ok: false,
        errors: { f0: code },
      });
    }
  });

  it("自定义正则：匹配放行，不匹配报 regex", () => {
    const fields = resolveFormFields(
      formWith([{ validation: "regex", pattern: "^\\d{4}-\\d{4}$" }]),
    );
    expect(validateFormValues(fields, { f0: "1234-5678" }).ok).toBe(true);
    expect(validateFormValues(fields, { f0: "1234" })).toEqual({
      ok: false,
      errors: { f0: "site.form.regex" },
    });
  });

  it("租户填了非法正则不会让校验崩掉，当作不匹配处理", () => {
    const fields = resolveFormFields(
      formWith([{ validation: "regex", pattern: "([invalid" }]),
    );
    expect(validateFormValues(fields, { f0: "anything" })).toEqual({
      ok: false,
      errors: { f0: "site.form.regex" },
    });
  });

  it("自定义长度上下限：太短 / 太长 / 刚好都报对", () => {
    const fields = resolveFormFields(
      formWith([{ min_length: 5, max_length: 10 }]),
    );
    expect(validateFormValues(fields, { f0: "ab" })).toEqual({
      ok: false,
      errors: { f0: "site.form.too_short" },
    });
    expect(validateFormValues(fields, { f0: "abcdefghijk" })).toEqual({
      ok: false,
      errors: { f0: "site.form.too_long" },
    });
    expect(validateFormValues(fields, { f0: "刚好五个字" }).ok).toBe(true);
  });

  it("max_length 不能突破类型硬上限（单行 200）", () => {
    const fields = resolveFormFields(formWith([{ max_length: 300 }]));
    // 超过 200 的硬上限仍被拒——租户设的 300 不等于放宽
    expect(validateFormValues(fields, { f0: "x".repeat(201) }).ok).toBe(false);
  });

  it("不认识的校验规则退回 none，不校验", () => {
    const fields = resolveFormFields(formWith([{ validation: "weird" }]));
    expect(fields[0]!.validation).toBe("none");
    expect(validateFormValues(fields, { f0: "anything" }).ok).toBe(true);
  });
});
