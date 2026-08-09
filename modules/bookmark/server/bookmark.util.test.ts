import { describe, expect, it } from "vitest";

import {
  buildDescriptionPreview,
  extractBookmarkHost,
  normalizeBookmarkUrl,
  validateBookmarkInput,
  BOOKMARK_DESCRIPTION_MAX_LENGTH,
  BOOKMARK_TITLE_MAX_LENGTH,
  BOOKMARK_URL_MAX_LENGTH,
} from "./bookmark.util.js";

describe("normalizeBookmarkUrl", () => {
  it("缺 scheme 时补 https://", () => {
    expect(normalizeBookmarkUrl("example.com")).toBe("https://example.com/");
  });

  it("保留已有的 http scheme", () => {
    expect(normalizeBookmarkUrl("http://example.com/a?b=1")).toBe(
      "http://example.com/a?b=1",
    );
  });

  it("去掉尾随空白与空 hash", () => {
    expect(normalizeBookmarkUrl("  https://example.com/#  ")).toBe(
      "https://example.com/",
    );
  });

  it("拒绝 http/https 之外的 scheme", () => {
    expect(normalizeBookmarkUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeBookmarkUrl("data:text/html,<b>x</b>")).toBeNull();
    expect(normalizeBookmarkUrl("ftp://example.com")).toBeNull();
  });

  it("拒绝空串与解析不了的输入", () => {
    expect(normalizeBookmarkUrl("   ")).toBeNull();
    expect(normalizeBookmarkUrl("https://")).toBeNull();
  });
});

describe("extractBookmarkHost", () => {
  it("去掉 www. 前缀", () => {
    expect(extractBookmarkHost("https://www.example.com/a")).toBe(
      "example.com",
    );
  });

  it("保留子域，去掉端口", () => {
    expect(extractBookmarkHost("http://docs.example.com:8080/x")).toBe(
      "docs.example.com",
    );
  });

  it("非法链接给空串", () => {
    expect(extractBookmarkHost("javascript:alert(1)")).toBe("");
  });
});

describe("buildDescriptionPreview", () => {
  it("空白描述给空串", () => {
    expect(buildDescriptionPreview("   \n\t  ")).toBe("");
  });

  it("合并空白", () => {
    expect(buildDescriptionPreview("  多余\n空白  内容  ")).toBe(
      "多余 空白 内容",
    );
  });

  it("超长描述截断并加省略号", () => {
    const preview = buildDescriptionPreview("a".repeat(200));
    expect(preview).toHaveLength(121);
    expect(preview.endsWith("…")).toBe(true);
  });
});

describe("validateBookmarkInput", () => {
  it("默认要求 URL", () => {
    expect(validateBookmarkInput({ title: "t" })).toEqual({
      code: "bookmark.url_required",
    });
  });

  it("拒绝非 http(s) 链接", () => {
    expect(
      validateBookmarkInput({ url: "javascript:alert(1)", title: "t" }),
    ).toEqual({ code: "bookmark.url_invalid" });
  });

  it("拒绝超长 URL", () => {
    expect(
      validateBookmarkInput({
        url: `https://example.com/${"a".repeat(BOOKMARK_URL_MAX_LENGTH)}`,
        title: "t",
      }),
    ).toEqual({
      code: "bookmark.url_too_long",
      params: { max: BOOKMARK_URL_MAX_LENGTH },
    });
  });

  it("默认要求标题", () => {
    expect(validateBookmarkInput({ url: "https://example.com" })).toEqual({
      code: "bookmark.title_required",
    });
  });

  it("requireTitle=false 时标题可缺省（创建走主机名兜底）", () => {
    expect(
      validateBookmarkInput(
        { url: "https://example.com" },
        { requireTitle: false },
      ),
    ).toBeNull();
  });

  it("requireTitle=false 但显式传空标题仍然拒绝", () => {
    expect(
      validateBookmarkInput(
        { url: "https://example.com", title: "  " },
        { requireTitle: false },
      ),
    ).toEqual({ code: "bookmark.title_required" });
  });

  it("requireUrl=false 时 URL 可缺省（局部更新）", () => {
    expect(
      validateBookmarkInput(
        { title: "t" },
        { requireUrl: false, requireTitle: false },
      ),
    ).toBeNull();
  });

  it("requireUrl=false 但显式传空 URL 仍然拒绝", () => {
    expect(
      validateBookmarkInput(
        { url: "  " },
        { requireUrl: false, requireTitle: false },
      ),
    ).toEqual({ code: "bookmark.url_required" });
  });

  it("拒绝超长标题", () => {
    expect(
      validateBookmarkInput({
        url: "https://example.com",
        title: "x".repeat(BOOKMARK_TITLE_MAX_LENGTH + 1),
      }),
    ).toEqual({
      code: "bookmark.title_too_long",
      params: { max: BOOKMARK_TITLE_MAX_LENGTH },
    });
  });

  it("拒绝超长描述", () => {
    expect(
      validateBookmarkInput({
        url: "https://example.com",
        title: "t",
        description: "y".repeat(BOOKMARK_DESCRIPTION_MAX_LENGTH + 1),
      }),
    ).toEqual({
      code: "bookmark.description_too_long",
      params: { max: BOOKMARK_DESCRIPTION_MAX_LENGTH },
    });
  });

  it("接受合法输入", () => {
    expect(
      validateBookmarkInput({
        url: "example.com",
        title: "标题",
        description: "描述",
      }),
    ).toBeNull();
  });
});
