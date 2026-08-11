import { describe, expect, it } from "vitest";

import { validateImageUpload } from "./image-upload.js";

const RULES = {
  allowed_mime_types: ["image/png", "image/jpeg"] as const,
  max_bytes: 10,
  error_codes: {
    invalid_mime: "demo.invalid_mime",
    empty: "demo.empty",
    too_large: "demo.too_large",
  },
};

describe("validateImageUpload", () => {
  it("normalizes the mime type", () => {
    expect(validateImageUpload(Buffer.from("x"), " IMAGE/PNG ", RULES)).toBe(
      "image/png",
    );
  });

  it("rejects mime types outside the allowlist", () => {
    expect(() =>
      validateImageUpload(Buffer.from("x"), "application/pdf", RULES),
    ).toThrow(expect.objectContaining({ code: "demo.invalid_mime" }));
  });

  it("rejects empty uploads", () => {
    expect(() => validateImageUpload(Buffer.alloc(0), "image/png", RULES)).toThrow(
      expect.objectContaining({ code: "demo.empty" }),
    );
  });

  it("reports the limit so the UI can render it", () => {
    expect(() =>
      validateImageUpload(Buffer.alloc(11), "image/png", RULES),
    ).toThrow(
      expect.objectContaining({
        code: "demo.too_large",
        params: { max_bytes: 10 },
      }),
    );
  });
});
