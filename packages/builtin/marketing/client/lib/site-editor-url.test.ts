import { describe, expect, it } from "vitest";

import { siteEditorPath } from "./site-editor-url.js";

describe("siteEditorPath", () => {
  it("omits the default sections scope from the query", () => {
    expect(siteEditorPath({ pageId: "p1" })).toBe("/app/site/editor?page=p1");
    expect(siteEditorPath({ scope: "theme" })).toBe(
      "/app/site/editor?scope=theme",
    );
  });
});
