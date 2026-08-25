import { describe, expect, it } from "vitest";

import {
  buildContentPayload,
  displayContentTitle,
  INITIAL_CONTENT_FORM,
  validateContentForm,
} from "./contents.js";

const t = (key: string): string => key;

describe("validateContentForm", () => {
  it("requires a source when asked", () => {
    expect(
      validateContentForm({ ...INITIAL_CONTENT_FORM, brief: "  " }, t, {
        requireSource: true,
      }),
    ).toBe("validation.sourceRequired");
  });

  it("allows an empty title", () => {
    expect(
      validateContentForm({ ...INITIAL_CONTENT_FORM, brief: "hello" }, t),
    ).toBeNull();
  });
});

describe("buildContentPayload", () => {
  it("trims text fields", () => {
    expect(
      buildContentPayload({
        ...INITIAL_CONTENT_FORM,
        title: "  x  ",
        brief: "  y  ",
        format: "article",
      }),
    ).toEqual({
      title: "x",
      brief: "y",
      body: "",
      format: "article",
    });
  });
});

describe("displayContentTitle", () => {
  it("falls back to untitled", () => {
    expect(displayContentTitle("  ", t)).toBe("untitled");
  });
});
