import { registerI18nBundles, setupI18n } from "@rewindom/module-sdk/client";
import { describe, expect, it } from "vitest";

import { BOOKMARK_I18N } from "../i18n.js";

import {
  buildBookmarkPayload,
  guessBookmarkHost,
  normalizeBookmarkUrl,
  validateBookmarkForm,
  BOOKMARK_DESCRIPTION_MAX_LENGTH,
  BOOKMARK_TITLE_MAX_LENGTH,
  BOOKMARK_URL_MAX_LENGTH,
  INITIAL_BOOKMARK_FORM,
} from "./bookmarks.js";

registerI18nBundles([BOOKMARK_I18N]);
setupI18n();
const t = (key: string, options?: Record<string, unknown>): string =>
  setupI18n().t(key, { ns: "bookmark", ...options });

describe("normalizeBookmarkUrl", () => {
  it("缺 scheme 时补 https://（与服务端同口径）", () => {
    expect(normalizeBookmarkUrl("example.com")).toBe("https://example.com/");
  });

  it("拒绝 http/https 之外的 scheme", () => {
    expect(normalizeBookmarkUrl("javascript:alert(1)")).toBeNull();
  });

  it("拒绝空输入", () => {
    expect(normalizeBookmarkUrl("  ")).toBeNull();
  });
});

describe("guessBookmarkHost", () => {
  it("去掉 www. 前缀", () => {
    expect(guessBookmarkHost("www.example.com/a")).toBe("example.com");
  });

  it("解析不了时给空串", () => {
    expect(guessBookmarkHost("не url")).toBe("");
  });
});

describe("validateBookmarkForm", () => {
  it("要求 URL", () => {
    expect(validateBookmarkForm(INITIAL_BOOKMARK_FORM, t)).toBe(
      t("validation.urlRequired"),
    );
  });

  it("拒绝非 http(s) 链接", () => {
    expect(
      validateBookmarkForm(
        { ...INITIAL_BOOKMARK_FORM, url: "javascript:alert(1)" },
        t,
      ),
    ).toBe(t("validation.urlInvalid"));
  });

  it("拒绝超长 URL", () => {
    expect(
      validateBookmarkForm(
        {
          ...INITIAL_BOOKMARK_FORM,
          url: `https://example.com/${"a".repeat(BOOKMARK_URL_MAX_LENGTH)}`,
        },
        t,
      ),
    ).toBe(t("validation.urlTooLong", { max: BOOKMARK_URL_MAX_LENGTH }));
  });

  it("拒绝超长标题", () => {
    expect(
      validateBookmarkForm(
        {
          url: "https://example.com",
          title: "x".repeat(BOOKMARK_TITLE_MAX_LENGTH + 1),
          description: "",
        },
        t,
      ),
    ).toBe(t("validation.titleTooLong", { max: BOOKMARK_TITLE_MAX_LENGTH }));
  });

  it("拒绝超长描述", () => {
    expect(
      validateBookmarkForm(
        {
          url: "https://example.com",
          title: "",
          description: "y".repeat(BOOKMARK_DESCRIPTION_MAX_LENGTH + 1),
        },
        t,
      ),
    ).toBe(
      t("validation.descriptionTooLong", {
        max: BOOKMARK_DESCRIPTION_MAX_LENGTH,
      }),
    );
  });

  it("标题留空是合法的（服务端用主机名兜底）", () => {
    expect(
      validateBookmarkForm(
        { url: "example.com", title: "", description: "" },
        t,
      ),
    ).toBeNull();
  });
});

describe("buildBookmarkPayload", () => {
  it("归一 URL 并裁掉首尾空白", () => {
    expect(
      buildBookmarkPayload({
        url: "  example.com  ",
        title: "  标题  ",
        description: "  描述\n",
      }),
    ).toEqual({
      url: "https://example.com/",
      title: "标题",
      description: "描述",
    });
  });

  it("标题留空时回落到主机名", () => {
    expect(
      buildBookmarkPayload({
        url: "https://www.example.com/docs",
        title: "   ",
        description: "",
      }),
    ).toEqual({
      url: "https://www.example.com/docs",
      title: "example.com",
      description: "",
    });
  });
});
