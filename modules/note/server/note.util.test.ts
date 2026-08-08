import { describe, expect, it } from "vitest";

import {
  buildNoteContentPreview,
  validateNoteInput,
  NOTE_CONTENT_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
} from "./note.util.js";

describe("buildNoteContentPreview", () => {
  it("returns empty string for blank content", () => {
    expect(buildNoteContentPreview("   \n\t  ")).toBe("");
  });

  it("truncates long content with ellipsis", () => {
    const content = "a".repeat(200);
    const preview = buildNoteContentPreview(content);
    expect(preview.endsWith("…")).toBe(true);
    expect(preview.length).toBe(121);
  });
});

describe("validateNoteInput", () => {
  it("requires title by default", () => {
    expect(validateNoteInput({ title: "  " })).toEqual({
      code: "note.title_enter",
    });
  });

  it("rejects overlong title", () => {
    expect(
      validateNoteInput({ title: "x".repeat(NOTE_TITLE_MAX_LENGTH + 1) }),
    ).toEqual({
      code: "note.title_too_long",
      params: { max: NOTE_TITLE_MAX_LENGTH },
    });
  });

  it("rejects overlong content", () => {
    expect(
      validateNoteInput({
        title: "ok",
        content: "y".repeat(NOTE_CONTENT_MAX_LENGTH + 1),
      }),
    ).toEqual({
      code: "note.content_too_long",
      params: { max: NOTE_CONTENT_MAX_LENGTH },
    });
  });

  it("accepts valid input", () => {
    expect(validateNoteInput({ title: "标题", content: "正文" })).toBeNull();
  });
});
