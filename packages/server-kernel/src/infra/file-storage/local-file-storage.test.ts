import { describe, expect, it } from "vitest";

import { buildEnterpriseDocumentStorageKey } from "./local-file-storage.js";

describe("buildEnterpriseDocumentStorageKey", () => {
  it("builds tenant-scoped path with safe extension", () => {
    expect(
      buildEnterpriseDocumentStorageKey(
        "tenant-1",
        "doc-1",
        "product-spec.md",
      ),
    ).toBe("enterprise-documents/tenant-1/doc-1.md");
  });

  it("handles filename without extension", () => {
    expect(
      buildEnterpriseDocumentStorageKey("tenant-1", "doc-1", "README"),
    ).toBe("enterprise-documents/tenant-1/doc-1");
  });
});
