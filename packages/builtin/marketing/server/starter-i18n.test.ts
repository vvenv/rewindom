import { describe, expect, it } from "vitest";

import { registerLocaleCatalog } from "@rewindom/shared";

import { createStarterTranslator } from "./starter-i18n.js";

describe("createStarterTranslator", () => {
  it("resolves preset keys for zh-CN", () => {
    const t = createStarterTranslator("zh-CN");
    expect(t("preset.home.title")).not.toBe("preset.home.title");
    expect(t("preset.not_found.title")).toBe("页面不存在");
    expect(t("starter.default.site_name")).toBe("我的站点");
  });

  it("falls back to zh-CN for missing en strings", () => {
    const t = createStarterTranslator("en");
    expect(t("starter.default.site_name")).toBe("My site");
  });

  it("resolves contributed namespaced keys from the locale catalog", () => {
    registerLocaleCatalog("starter-i18n-test", {
      "zh-CN": { account: { title: "我的订阅" } },
      en: { account: { title: "My subscription" } },
    });
    expect(createStarterTranslator("zh-CN")("starter-i18n-test:account.title")).toBe(
      "我的订阅",
    );
    expect(createStarterTranslator("en")("starter-i18n-test:account.title")).toBe(
      "My subscription",
    );
    expect(createStarterTranslator("zh-CN")("unknown-ns:account.title")).toBe(
      "unknown-ns:account.title",
    );
  });
});
