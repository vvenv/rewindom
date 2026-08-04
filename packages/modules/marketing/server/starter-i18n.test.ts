import { describe, expect, it } from "vitest";

import { createStarterTranslator } from "./starter-i18n.js";

describe("createStarterTranslator", () => {
  it("resolves preset keys for zh-CN", () => {
    const t = createStarterTranslator("zh-CN");
    expect(t("preset.home.title")).not.toBe("preset.home.title");
    expect(t("starter.default.login")).toBe("登录");
  });

  it("falls back to zh-CN for missing en strings", () => {
    const t = createStarterTranslator("en");
    expect(t("starter.default.login")).toBe("Sign in");
  });
});
