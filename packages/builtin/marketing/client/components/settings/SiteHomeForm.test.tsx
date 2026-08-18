import { type ReactElement } from "react";

import { registerI18nBundles, setupI18n } from "@rewindom/client-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { MARKETING_I18N } from "../../i18n.js";
import { useSiteSettingsForm } from "../../hooks/use-site-settings-form.js";
import { registerHomeLayout } from "../../../shared/home-layouts.js";
import "../../../shared/page-presets.js";

import { SiteHomeForm } from "./SiteHomeForm.js";

import type { HomeLayoutDefinition } from "../../../shared/home-layouts.js";
import type { MarketingSite } from "../../../shared/site-cms.js";

vi.mock("@rewindom/client-kit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@rewindom/client-kit")>()),
  useConfirm: () => ({ confirm: vi.fn(async () => true) }),
}));

vi.mock("../../hooks/useSite.js", () => ({
  useSite: () => ({
    data: {
      home_layout_key: "marketing.default",
    },
  }),
  useSitePages: () => ({ data: [] }),
  useSiteCapabilities: () => ({ data: { entitlements: [] } }),
  useSiteMutations: () => ({
    updateSite: { mutate: vi.fn(), isPending: false },
    applyHomeLayout: { mutate: vi.fn(), isPending: false },
  }),
}));

registerI18nBundles([MARKETING_I18N]);
setupI18n("zh-CN");

const EXTRA_LAYOUT: HomeLayoutDefinition = {
  key: "test.home",
  label: "marketing:preset.home.layoutLabel",
  preset: {
    key: "test.home",
    label: "marketing:preset.home.layoutLabel",
    kind: "home",
    slug: "home",
    titleKey: "marketing:preset.home.title",
    descriptionKey: "marketing:preset.home.description",
    sections: [{ type: "hero" }],
  },
};

beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  registerHomeLayout(EXTRA_LAYOUT);
});

function site(): MarketingSite {
  return {
    id: "site-1",
    tenant_id: "tenant-1",
    site_name: "示例站点",
    tagline: "",
    logo_url: null,
    primary_color: null,
    theme_settings: {},
    theme_key: null,
    default_locale: "zh-CN",
    header: [],
    footer: [],
    site_draft_dirty: false,
    published: true,
    home_path: "/",
    home_layout_key: "marketing.default",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function Harness(): ReactElement | null {
  const form = useSiteSettingsForm(site());
  if (!form.ready) return null;
  return <SiteHomeForm form={form} canWrite />;
}

function renderForm(): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  );
}

describe("SiteHomeForm 首页", () => {
  it("有两套版式时仍是一个首页下拉，不再单列版式", () => {
    renderForm();
    expect(screen.getByLabelText("首页")).toBeInTheDocument();
    expect(screen.queryByLabelText("首页版式")).not.toBeInTheDocument();
  });
});
