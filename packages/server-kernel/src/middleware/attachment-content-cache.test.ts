import { describe, expect, it } from "vitest";

import {
  ATTACHMENT_CONTENT_CACHE_CONTROL,
  isAttachmentContentRequest,
} from "./attachment-content-cache.js";

describe("attachment-content-cache", () => {
  it("matches attachment content GET paths", () => {
    expect(
      isAttachmentContentRequest(
        "GET",
        "/api/attachments/d010ebb8-5b75-4260-ab86-a1bf9443b537/content",
      ),
    ).toBe(true);
    expect(
      isAttachmentContentRequest(
        "GET",
        "/api/attachments/d010ebb8-5b75-4260-ab86-a1bf9443b537/content?foo=1",
      ),
    ).toBe(true);
  });

  it("rejects non-content attachment routes", () => {
    expect(isAttachmentContentRequest("GET", "/api/attachments")).toBe(false);
    expect(
      isAttachmentContentRequest(
        "DELETE",
        "/api/attachments/d010ebb8-5b75-4260-ab86-a1bf9443b537",
      ),
    ).toBe(false);
    expect(
      isAttachmentContentRequest(
        "POST",
        "/api/attachments/d010ebb8-5b75-4260-ab86-a1bf9443b537/content",
      ),
    ).toBe(false);
  });

  it("uses long-lived immutable private cache", () => {
    expect(ATTACHMENT_CONTENT_CACHE_CONTROL).toContain("immutable");
    expect(ATTACHMENT_CONTENT_CACHE_CONTROL).toContain("max-age=31536000");
    expect(ATTACHMENT_CONTENT_CACHE_CONTROL).toContain("private");
  });
});
