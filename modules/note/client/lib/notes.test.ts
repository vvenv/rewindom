import { registerI18nBundles, setupI18n } from "@be-water/module-sdk/client";
import { describe, expect, it } from "vitest";

import { NOTE_I18N } from "../i18n.js";
import {
  buildNotePayload,
  INITIAL_NOTE_FORM,
  NOTE_CONTENT_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  validateNoteForm,
} from "./notes.js";

registerI18nBundles([NOTE_I18N]);
setupI18n();
const t = (key: string, options?: Record<string, unknown>): string =>
  setupI18n().t(key, { ns: "note", ...options });

describe("validateNoteForm", () => {
  it("requires title", () => {
    expect(validateNoteForm({ ...INITIAL_NOTE_FORM, title: "  " }, t)).toBe(
      t("validation.titleRequired"),
    );
  });

  it("rejects overlong title", () => {
    expect(
      validateNoteForm(
        {
          title: "x".repeat(NOTE_TITLE_MAX_LENGTH + 1),
          content: "",
        },
        t,
      ),
    ).toBe(t("validation.titleTooLong", { max: NOTE_TITLE_MAX_LENGTH }));
  });

  it("rejects overlong content", () => {
    expect(
      validateNoteForm(
        {
          title: "ok",
          content: "y".repeat(NOTE_CONTENT_MAX_LENGTH + 1),
        },
        t,
      ),
    ).toBe(t("validation.contentTooLong", { max: NOTE_CONTENT_MAX_LENGTH }));
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
