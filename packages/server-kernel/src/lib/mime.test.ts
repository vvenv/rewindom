import { describe, expect, it } from "vitest";

import { extensionToMimeType, mimeTypeToExtension } from "./mime.js";

describe("mime", () => {
  it("maps known image mime types to extensions", () => {
    expect(mimeTypeToExtension("image/png")).toBe(".png");
    expect(mimeTypeToExtension("IMAGE/JPEG")).toBe(".jpg");
    expect(mimeTypeToExtension("image/svg+xml")).toBe(".svg");
  });

  it("returns empty string for unknown mime types", () => {
    expect(mimeTypeToExtension("application/pdf")).toBe("");
  });

  it("maps extensions back to mime types", () => {
    expect(extensionToMimeType(".JPEG")).toBe("image/jpeg");
    expect(extensionToMimeType(".webp")).toBe("image/webp");
  });

  it("falls back to octet-stream for unknown extensions", () => {
    expect(extensionToMimeType(".exe")).toBe("application/octet-stream");
  });

  it("round-trips: 存储键按 MIME 生成，公开 URL 按扩展名反推，两边必须闭合", () => {
    for (const mime of [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "image/x-icon",
    ]) {
      expect(extensionToMimeType(mimeTypeToExtension(mime))).toBe(mime);
    }
  });
});
