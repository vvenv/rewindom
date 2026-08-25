import { describe, expect, it } from "vitest";

import {
  buildContentPayload,
  displayContentTitle,
  hasBriefInput,
  INITIAL_CONTENT_FORM,
  validateBriefForm,
  validateContentForm,
} from "./contents.js";

import type { ContentTemplateField } from "../../shared/index.js";

const t = (key: string): string => key;

function field(
  overrides: Partial<ContentTemplateField> = {},
): ContentTemplateField {
  return {
    id: "subject",
    label: "写什么",
    type: "text",
    required: false,
    placeholder: "",
    help: "",
    options: [],
    ...overrides,
  };
}

describe("validateContentForm", () => {
  it("allows an empty title", () => {
    expect(validateContentForm(INITIAL_CONTENT_FORM, t)).toBeNull();
  });

  it("catches an over-long title", () => {
    expect(
      validateContentForm(
        { ...INITIAL_CONTENT_FORM, title: "x".repeat(201) },
        t,
      ),
    ).toBe("validation.titleTooLong");
  });
});

describe("validateBriefForm", () => {
  it("报必填，且逐字段给", () => {
    const errors = validateBriefForm(
      [field({ required: true }), field({ id: "extra", required: true })],
      { subject: "有值" },
      t,
    );
    expect(Object.keys(errors)).toEqual(["extra"]);
  });

  it("下拉只收列出来的值", () => {
    const errors = validateBriefForm(
      [field({ type: "select", options: ["A", "B"] })],
      { subject: "C" },
      t,
    );
    expect(errors.subject).toBe("fieldError.option");
  });

  it("填全了就没有错", () => {
    expect(
      validateBriefForm([field({ required: true })], { subject: "有值" }, t),
    ).toEqual({});
  });
});

describe("hasBriefInput", () => {
  it("全是空白不算填了", () => {
    expect(hasBriefInput({ a: "  ", b: "" })).toBe(false);
    expect(hasBriefInput({ a: "  ", b: "x" })).toBe(true);
  });
});

describe("buildContentPayload", () => {
  it("trims text fields and passes the filled values through", () => {
    expect(
      buildContentPayload({
        ...INITIAL_CONTENT_FORM,
        title: "  x  ",
        format: "article",
        template_id: "tpl-1",
        values: { subject: "y" },
      }),
    ).toEqual({
      title: "x",
      body: "",
      format: "article",
      template_id: "tpl-1",
      brief_values: { subject: "y" },
    });
  });
});

describe("displayContentTitle", () => {
  it("falls back to untitled", () => {
    expect(displayContentTitle("  ", t)).toBe("untitled");
  });
});
