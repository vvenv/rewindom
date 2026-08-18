import { registerI18nBundles, setupI18n } from "@rewindom/client-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MARKETING_I18N } from "../i18n.js";

import { SiteSummaryHeader } from "./SiteSummaryHeader.js";

import type { MarketingSite } from "../../shared/site-cms.js";

vi.mock("@rewindom/client-kit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@rewindom/client-kit")>()),
  useConfirm: () => ({ confirm: vi.fn(async () => true) }),
  usePermissions: () => ({ hasPermission: () => false }),
}));

vi.mock("../hooks/useSite.js", () => ({
  useSiteMutations: () => ({
    updateSite: { mutate: vi.fn(), isPending: false },
    applyHomeLayout: { mutate: vi.fn(), isPending: false },
  }),
  useSitePages: () => ({ data: [] }),
  useSiteCapabilities: () => ({ data: { entitlements: [] } }),
}));

registerI18nBundles([MARKETING_I18N]);
setupI18n("zh-CN");

const site = {
  id: "site-1",
  site_name: "Acme",
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
} as unknown as MarketingSite;

/**
 * 设置是 Sheet 触发器；Sheet 里的 form hook 走了 mutations，要套 QueryClient。
 */
function renderHeader(summary?: {
  total: number;
  published: number;
  dirty: number;
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SiteSummaryHeader
          site={site}
          defaultLocale="zh-CN"
          isLoading={false}
          summary={summary}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SiteSummaryHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fills the counts in (interpolation names must match the catalog)", () => {
    renderHeader({ total: 5, published: 3, dirty: 2 });

    expect(screen.getByText("5 个页面")).toBeInTheDocument();
    expect(screen.getByText("3 个已发布")).toBeInTheDocument();
    expect(screen.getByText("2 个有改动未发布")).toBeInTheDocument();
  });

  it("hides the dirty count when nothing is waiting to be published", () => {
    renderHeader({ total: 5, published: 5, dirty: 0 });

    expect(screen.queryByText(/有改动未发布/)).toBeNull();
  });

  it("draws no counts before the page list has loaded", () => {
    renderHeader();

    expect(screen.queryByText(/个页面/)).toBeNull();
  });

  it("offers a new-window entrance to the live site without write permission", () => {
    renderHeader();

    const link = screen.getByRole("link", { name: "查看官网" });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("does not offer a duplicate page-editor entrance on the card header", () => {
    renderHeader();

    expect(screen.queryByRole("link", { name: /编辑/ })).toBeNull();
  });

  it("offers Appearance next to Site settings", () => {
    renderHeader();

    const appearance = screen.getByRole("link", { name: "外观" });
    expect(appearance).toHaveAttribute("href", "/app/site/editor?scope=theme");
    expect(
      screen.getByRole("button", { name: "站点设置" }),
    ).toBeInTheDocument();
  });

  it("keeps Settings as a sheet trigger without write permission", () => {
    renderHeader();

    expect(
      screen.getByRole("button", { name: "站点设置" }),
    ).toBeInTheDocument();
  });
});
