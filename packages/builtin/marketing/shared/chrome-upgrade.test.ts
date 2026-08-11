import { createSection } from "./section-schema.js";
import { upgradeChromeSection } from "./chrome-upgrade.js";
import { defaultHeaderNavItems } from "./site-nav.js";

import type { SiteSection } from "./section-schema.js";

function legacyHeader(settings: Record<string, unknown> = {}): SiteSection {
  return {
    id: "hdr-legacy",
    type: "header",
    settings: {
      sticky: true,
      show_logo: true,
      show_site_name: true,
      items: defaultHeaderNavItems(),
      ...settings,
    },
    blocks: [],
  };
}

function legacyFooter(settings: Record<string, unknown> = {}): SiteSection {
  return {
    id: "ftr-legacy",
    type: "footer",
    settings: {
      show_logo: false,
      ...settings,
    },
    blocks: [],
  };
}

describe("upgradeChromeSection", () => {
  it("moves legacy header settings into ordered blocks", () => {
    const upgraded = upgradeChromeSection(
      legacyHeader({
        show_doc_search: true,
        primary_label: "开始",
        primary_href: "/docs",
      }),
    );

    expect(upgraded.blocks.map((block) => block.type)).toEqual([
      "chrome_brand",
      "chrome_nav",
      "chrome_doc_search",
      "chrome_button",
    ]);
    expect(upgraded.settings.items).toBeUndefined();
    expect(upgraded.settings.sticky).toBe(true);
  });

  it("moves legacy footer settings into brand and copyright blocks", () => {
    const upgraded = upgradeChromeSection(
      legacyFooter({
        blurb: "简介",
        copyright: "© 2026 Acme",
      }),
    );

    expect(upgraded.blocks[0]?.type).toBe("chrome_brand");
    expect(upgraded.blocks[0]?.settings.blurb).toBe("简介");
    expect(upgraded.blocks.at(-1)?.type).toBe("chrome_copyright");
    expect(upgraded.blocks.at(-1)?.settings.text).toBe("© 2026 Acme");
  });

  it("is idempotent once chrome blocks exist", () => {
    const once = upgradeChromeSection(createSection("header"));
    const twice = upgradeChromeSection(once);
    expect(twice).toEqual(once);
  });
});
