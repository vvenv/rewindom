import { registerI18nBundles, setupI18n } from "@rewindom/client-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MARKETING_I18N } from "../../i18n.js";
import { useSiteSettingsForm } from "../../hooks/use-site-settings-form.js";

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
    default_locale: "zh-CN",
    header: [],
    footer: [],
    site_draft_dirty: false,
    published: true,
    home_path: "/",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

/**
 * 三个分区共用一份草稿（`useSiteSettingsForm`），所以一起挂：主语言的「钉语言」
 * 会改到基本信息那两个输入框，分开渲染就测不到这条真正容易出错的耦合。
 */
function Harness({ value }: { value: MarketingSite }) {
  const form = useSiteSettingsForm(value);
  if (!form.ready) return null;
  return (
    <>
      <SiteBasicsForm form={form} canWrite />
      <SiteLocaleForm form={form} canWrite />
      <SiteVisibilityForm form={form} canWrite />
    </>
  );
}

async function renderForms(value: MarketingSite = site()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <Harness value={value} />
    </QueryClientProvider>,
  );
  await screen.findByLabelText("站点名称");
}

const nameInput = () => screen.getByLabelText("站点名称");

/** 失焦即存。 */
function blurBasics() {
  fireEvent.blur(nameInput());
}

/** 切换「正在编辑哪种译文」。 */
function editIn(locale: string) {
  fireEvent.click(screen.getByRole("button", { name: locale }));
}

/**
 * 换主语言。
 *
 * 走键盘而不是点击：Radix 的 Select 靠 pointer 事件开合，而 jsdom 没有 PointerEvent，
 * fireEvent 造出来的事件缺 button / pointerType，触发不了它的展开逻辑。
 * 选中后会先弹确认（`confirmMock`），确认通过才 `commit`。
 */
async function setPrimaryLocale(locale: string) {
  const trigger = screen.getByLabelText("主语言");
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  const option = await screen.findByRole("option", { name: locale });
  fireEvent.keyDown(option, { key: "Enter" });
}

beforeEach(() => {
  confirmMock.mockReset();
  confirmMock.mockResolvedValue(true);
  mutateMock.mockReset();
});

describe("基本信息", () => {
  it("主语言站名为空时失焦不落库，并把编辑语言切回主语言", async () => {
    await renderForms(site({ site_name: "" }));
    editIn("English");
    fireEvent.change(nameInput(), { target: { value: "Example" } });

    blurBasics();

    expect(mutateMock).not.toHaveBeenCalled();
    await waitFor(() => expect(nameInput()).toHaveValue(""));
  });

  it("失焦只提交站名与标语", async () => {
    await renderForms();
    editIn("English");
    fireEvent.change(nameInput(), { target: { value: "Example" } });

    blurBasics();

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toEqual({
      site_name: { __i18n: { "zh-CN": "示例站点", en: "Example" } },
      tagline: "一句话标语",
    });
  });

  it("没有改动时失焦不发请求", async () => {
    await renderForms();
    blurBasics();
    expect(mutateMock).not.toHaveBeenCalled();
  });
});

describe("语言", () => {
  it("选完先确认；不确认就不落库", async () => {
    await renderForms();
    confirmMock.mockResolvedValue(false);

    await setPrimaryLocale("English");

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("主语言")).toHaveTextContent("中文");
  });

  /**
   * 纯字符串文案的语言是隐含的（= 当时的主语言）。换主语言时若不先钉住，
   * 那串中文数据一个字节没动，含义却原地变成了英文站名。
   */
  it("确认后把原文钉在原主语言下，并与新主语言同一次请求落库", async () => {
    await renderForms();

    await setPrimaryLocale("English");

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toEqual({
      default_locale: "en",
      site_name: { __i18n: { "zh-CN": "示例站点" } },
      tagline: { __i18n: { "zh-CN": "一句话标语" } },
    });

    // 新主语言还没有站名，要另填
    expect(nameInput()).toHaveValue("");
    // 原文完好地留在「中文」名下
    editIn("中文");
    expect(nameInput()).toHaveValue("示例站点");
  });
});

describe("发布", () => {
  it("上线不拦，开关即存", async () => {
    await renderForms(site({ published: false }));

    fireEvent.click(screen.getByRole("switch"));

    expect(confirmMock).not.toHaveBeenCalled();
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toEqual({ published: true });
  });

  /** 下线是访客当场可见的破坏性动作，得拦一道。 */
  it("下线要先确认；不确认就不动", async () => {
    await renderForms();
    confirmMock.mockResolvedValue(false);

    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).not.toHaveBeenCalled();
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("确认后落库", async () => {
    await renderForms();

    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toEqual({ published: false });
  });
});
