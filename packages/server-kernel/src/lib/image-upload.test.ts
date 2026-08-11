import { describe, expect, it } from "vitest";

import { validateImageUpload } from "./image-upload.js";

const RULES = {
  allowed_mime_types: ["image/png", "image/jpeg", "image/svg+xml"] as const,
  max_bytes: 4096,
  error_codes: {
    invalid_mime: "demo.invalid_mime",
    empty: "demo.empty",
    too_large: "demo.too_large",
    unsafe_svg: "demo.unsafe_svg",
  },
};

describe("validateImageUpload", () => {
  it("normalizes the mime type", async () => {
    await expect(
      validateImageUpload(Buffer.from("x"), " IMAGE/PNG ", RULES),
    ).resolves.toMatchObject({ mime_type: "image/png" });
  });

  it("passes raster bytes through untouched", async () => {
    const input = Buffer.from("raw-png-bytes");
    const { buffer } = await validateImageUpload(input, "image/png", RULES);
    expect(buffer).toBe(input);
  });

  it("rejects mime types outside the allowlist", async () => {
    await expect(
      validateImageUpload(Buffer.from("x"), "application/pdf", RULES),
    ).rejects.toMatchObject({ code: "demo.invalid_mime" });
  });

  it("rejects empty uploads", async () => {
    await expect(
      validateImageUpload(Buffer.alloc(0), "image/png", RULES),
    ).rejects.toMatchObject({ code: "demo.empty" });
  });

  it("reports the limit so the UI can render it", async () => {
    await expect(
      validateImageUpload(Buffer.alloc(4097), "image/png", RULES),
    ).rejects.toMatchObject({
      code: "demo.too_large",
      params: { max_bytes: 4096 },
    });
  });

  it("returns sanitized bytes for SVG, not the uploaded ones", async () => {
    const input = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="5"/></svg>`,
    );
    const { buffer } = await validateImageUpload(input, "image/svg+xml", RULES);

    const out = buffer.toString("utf8");
    expect(out).not.toContain("<script");
    expect(out).toContain("<circle");
    // 落盘的必须是消毒后的那份
    expect(buffer.equals(input)).toBe(false);
  });

  it("rejects an SVG that sanitizes down to nothing", async () => {
    await expect(
      validateImageUpload(
        Buffer.from("<script>alert(1)</script>"),
        "image/svg+xml",
        RULES,
      ),
    ).rejects.toMatchObject({ code: "demo.unsafe_svg" });
  });

  it("checks size before sanitizing so a huge SVG cannot tie up the parser", async () => {
    await expect(
      validateImageUpload(
        Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg">`.padEnd(5000)),
        "image/svg+xml",
        RULES,
      ),
    ).rejects.toMatchObject({ code: "demo.too_large" });
  });
});
