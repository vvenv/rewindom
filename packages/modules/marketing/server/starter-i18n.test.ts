import { describe, expect, it } from "vitest";

import { createStarterTranslator } from "./starter-i18n.js";

describe("createStarterTranslator", () => {
  it("resolves preset keys for zh-CN", () => {
    const t = createStarterTranslator("zh-CN");
    expect(t("preset.home.title")).not.toBe("preset.home.title");
    expect(t("starter.default.cta")).toBe("免费开始");
  });

  it("falls back to zh-CN for missing en strings", () => {
    const t = createStarterTranslator("en");
    expect(t("starter.default.cta")).toBe("Start free");
  });
});
