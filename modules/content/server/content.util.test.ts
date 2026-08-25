import { describe, expect, it } from "vitest";

import {
  buildContentPreview,
  contentAssetObjectKey,
  parseContentFormat,
  validateContentInput,
} from "./content.util.js";

describe("parseContentFormat", () => {
  it("defaults missing format to note", () => {
    expect(parseContentFormat(undefined)).toBe("note");
  });

  it("rejects unknown formats", () => {
    expect(parseContentFormat("xiaohongshu")).toBeNull();
  });
});

describe("validateContentInput", () => {
  it("allows a blank title on create", () => {
    expect(validateContentInput({ title: "  " })).toBeNull();
  });

  it("rejects an unknown format", () => {
    expect(validateContentInput({ format: "tweet" })).toEqual({
      code: "content.invalid_format",
    });
  });
});

describe("buildContentPreview", () => {
  it("collapses whitespace", () => {
    expect(buildContentPreview("  hello   world  ")).toBe("hello world");
  });
});

describe("contentAssetObjectKey", () => {
  it("prefixes with tenant id", () => {
    expect(contentAssetObjectKey("t1", "c1", "a1", ".jpg")).toBe(
      "t1/contents/c1/a1.jpg",
    );
  });
});
