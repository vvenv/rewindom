import { type ReactElement } from "react";

import { registerI18nBundles, setupI18n } from "@rewindom/client-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MARKETING_I18N } from "../../i18n.js";
import { useSiteSettingsForm } from "../../hooks/use-site-settings-form.js";

import { SiteAnalyticsForm } from "./SiteAnalyticsForm.js";
import { SiteBasicsForm } from "./SiteBasicsForm.js";
import { SiteLocaleForm } from "./SiteLocaleForm.js";
import { SiteVisibilityForm } from "./SiteVisibilityForm.js";

import type { MarketingSite } from "../../../shared/site-cms.js";

const confirmMock = vi.fn<(options: unknown) => Promise<boolean>>();
const mutateMock = vi.fn();

vi.mock("@rewindom/client-kit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@rewindom/client-kit")>()),
  useConfirm: () => ({ confirm: confirmMock }),
}));

vi.mock("../../hooks/useSite.js", () => ({
  useSiteMutations: () => ({
    updateSite: { mutate: mutateMock, isPending: false },
  }),
}));

registerI18nBundles([MARKETING_I18N]);
setupI18n("zh-CN");

/** Radix 的 Select 依赖 jsdom 没实现的 pointer capture / scrollIntoView。 */
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function site(partial: Partial<MarketingSite> = {}): MarketingSite {
  return {
    id: "site-1",
    tenant_id: "tenant-1",
    site_name: "示例站点",
    tagline: "一句话标语",
    logo_url: null,
    primary_color: null,
    theme_settings: {},
    theme_key: null,
    analytics: { provider: "none", script_url: "", site_id: "" },
    default_locale: "zh-CN",
    header: [],
    footer: [],
    site_draft_dirty: false,
    published: true,
    home_path: "/",
    home_layout_key: "marketing.default",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

const EMPTY_ANALYTICS = { provider: "none", script_url: "", site_id: "" };

function Harness({ value }: { value: MarketingSite }) {
  const form = useSiteSettingsForm(value);
  if (!form.ready) return null;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.commit();
      }}
    >
      <SiteBasicsForm form={form} canWrite />
      <SiteLocaleForm form={form} canWrite />
      <SiteVisibilityForm form={form} canWrite />
      <SiteAnalyticsForm form={form} canWrite />
      <button type="submit">保存</button>
    </form>
  );
}

async function renderForms(value: MarketingSite = site()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <Harness value={value} />
    </QueryClientProvider>,
  );
  await screen.findByRole("group", { name: "站点名称" });
  return { ...view, client };
}

function refreshSite(
  rerender: (ui: ReactElement) => void,
  client: QueryClient,
  value: MarketingSite,
): void {
  rerender(
    <QueryClientProvider client={client}>
      <Harness value={value} />
    </QueryClientProvider>,
  );
}

function nameGroup() {
  return within(screen.getByRole("group", { name: "站点名称" }));
}

function nameZh() {
  return nameGroup().getByLabelText("中文");
}

function nameEn() {
  return nameGroup().getByLabelText("English");
}

function save() {
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
}

/**
 * 走键盘而不是点击：Radix 的 Select 靠 pointer 事件开合，而 jsdom 没有 PointerEvent。
 */
async function setSelect(label: string, optionName: string) {
  const trigger = screen.getByLabelText(label);
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.keyDown(option, { key: "Enter" });
}

beforeEach(() => {
  confirmMock.mockReset();
  confirmMock.mockResolvedValue(true);
  mutateMock.mockReset();
});

describe("基本信息", () => {
  it("每种语言一个输入框，没有译文切换按钮", async () => {
    await renderForms();
    expect(nameZh()).toHaveValue("示例站点");
    expect(nameEn()).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: "English" }),
    ).not.toBeInTheDocument();
  });

  it("改站名不发请求，点保存才提交", async () => {
    await renderForms();
    fireEvent.change(nameEn(), { target: { value: "Example" } });

    expect(mutateMock).not.toHaveBeenCalled();
    save();

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toMatchObject({
      site_name: { __i18n: { "zh-CN": "示例站点", en: "Example" } },
      tagline: "一句话标语",
      default_locale: "zh-CN",
      published: true,
      home_path: "/",
      analytics: EMPTY_ANALYTICS,
    });
  });

  it("主语言站名为空时保存不落库", async () => {
    await renderForms(site({ site_name: "" }));
    fireEvent.change(nameEn(), { target: { value: "Example" } });
    save();
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("没有改动时保存不发请求", async () => {
    await renderForms();
    save();
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("站点刷新不冲掉未保存的站名", async () => {
    const { rerender, client } = await renderForms();
    fireEvent.change(nameZh(), { target: { value: "新名字" } });

    refreshSite(
      rerender,
      client,
      site({
        published: false,
        updated_at: "2026-01-02T00:00:00.000Z",
      }),
    );

    expect(nameZh()).toHaveValue("新名字");
    expect(mutateMock).not.toHaveBeenCalled();
  });
});

describe("语言", () => {
  it("选完先确认；不确认就不改草稿", async () => {
    await renderForms();
    confirmMock.mockResolvedValue(false);

    await setSelect("主语言", "English");

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("主语言")).toHaveTextContent("中文");
  });

  it("确认后把原文钉在原主语言下，填好新主语言站名再保存才落库", async () => {
    await renderForms();

    await setSelect("主语言", "English");
    await waitFor(() =>
      expect(screen.getByLabelText("主语言")).toHaveTextContent("English"),
    );
    expect(mutateMock).not.toHaveBeenCalled();
    expect(nameEn()).toHaveValue("");
    expect(nameZh()).toHaveValue("示例站点");

    fireEvent.change(nameEn(), { target: { value: "Example" } });
    save();

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toMatchObject({
      default_locale: "en",
      site_name: { __i18n: { "zh-CN": "示例站点", en: "Example" } },
      tagline: { __i18n: { "zh-CN": "一句话标语" } },
    });
  });
});

describe("发布", () => {
  it("上线不拦，开关不即存", async () => {
    await renderForms(site({ published: false }));

    fireEvent.click(screen.getByRole("switch"));

    expect(confirmMock).not.toHaveBeenCalled();
    expect(mutateMock).not.toHaveBeenCalled();
    save();
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toMatchObject({ published: true });
  });

  it("下线要先确认；不确认就不动", async () => {
    await renderForms();
    confirmMock.mockResolvedValue(false);

    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).not.toHaveBeenCalled();
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("确认下线后仍等保存才落库", async () => {
    await renderForms();

    fireEvent.click(screen.getByRole("switch"));
    await waitFor(() => expect(screen.getByRole("switch")).not.toBeChecked());
    expect(mutateMock).not.toHaveBeenCalled();

    save();
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toMatchObject({ published: false });
  });
});

describe("访问分析", () => {
  it("选 Cloudflare 不发请求；空 token 保存被拦住", async () => {
    await renderForms();

    await setSelect("供应商", "Cloudflare");
    await waitFor(() =>
      expect(screen.getByLabelText("供应商")).toHaveTextContent("Cloudflare"),
    );
    expect(mutateMock).not.toHaveBeenCalled();

    save();
    expect(mutateMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("供应商")).toHaveTextContent("Cloudflare");
  });

  it("填了 token 再保存才提交", async () => {
    await renderForms();

    await setSelect("供应商", "Cloudflare");
    await waitFor(() => screen.getByLabelText("Beacon token"));
    fireEvent.change(screen.getByLabelText("Beacon token"), {
      target: { value: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    });
    save();

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toMatchObject({
      analytics: {
        provider: "cloudflare",
        script_url: "",
        site_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    });
  });
});
