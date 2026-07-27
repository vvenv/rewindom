import { describe, expect, it } from "vitest";

import {
  buildNotePayload,
  INITIAL_NOTE_FORM,
  NOTE_CONTENT_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  validateNoteForm,
} from "./notes.js";

describe("validateNoteForm", () => {
  it("requires title", () => {
    expect(validateNoteForm({ ...INITIAL_NOTE_FORM, title: "  " })).toBe(
      "请输入标题",
    );
  });

  it("rejects overlong title", () => {
    expect(
      validateNoteForm({
        title: "x".repeat(NOTE_TITLE_MAX_LENGTH + 1),
        content: "",
      }),
    ).toContain("标题不能超过");
  });

  it("rejects overlong content", () => {
    expect(
      validateNoteForm({
        title: "ok",
        content: "y".repeat(NOTE_CONTENT_MAX_LENGTH + 1),
      }),
    ).toContain("内容不能超过");
  });
});

describe("buildNotePayload", () => {
  it("trims fields", () => {
    expect(
      buildNotePayload({ title: "  标题  ", content: "  正文\n" }),
    ).toEqual({
      title: "标题",
      content: "正文",
    });
  });
});
