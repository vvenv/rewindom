import { registerI18nBundles, setupI18n } from "@be-water/client-kit";
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

vi.mock("@be-water/client-kit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@be-water/client-kit")>()),
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
    default_locale: "zh-CN",
    header: [],
    footer: [],
    site_draft_dirty: false,
    published: true,
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
const saveBasics = () =>
  fireEvent.click(screen.getAllByRole("button", { name: "保存" })[0]!);
const saveLocale = () =>
  fireEvent.click(screen.getAllByRole("button", { name: "保存" })[1]!);

/** 切换「正在编辑哪种译文」。 */
function editIn(locale: string) {
  fireEvent.click(screen.getByRole("button", { name: locale }));
}

/**
 * 换主语言。
 *
 * 走键盘而不是点击：Radix 的 Select 靠 pointer 事件开合，而 jsdom 没有 PointerEvent，
 * fireEvent 造出来的事件缺 button / pointerType，触发不了它的展开逻辑。
 */
async function setPrimaryLocale(locale: string) {
  const trigger = screen.getByLabelText("主语言");
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  const option = await screen.findByRole("option", { name: locale });
  fireEvent.keyDown(option, { key: "Enter" });
  await waitFor(() => expect(trigger).toHaveTextContent(locale));
}

beforeEach(() => {
  confirmMock.mockReset();
  confirmMock.mockResolvedValue(true);
  mutateMock.mockReset();
});

describe("基本信息", () => {
  it("主语言站名为空时不落库，并把编辑语言切回主语言", async () => {
    await renderForms(site({ site_name: "" }));
    // 切到副语言：此时输入框的 required 不生效，正是原来绕过校验的入口
    editIn("English");
    fireEvent.change(nameInput(), { target: { value: "Example" } });

    saveBasics();

    expect(mutateMock).not.toHaveBeenCalled();
    await waitFor(() => expect(nameInput()).toHaveValue(""));
  });

  it("只提交自己那两个字段，不捎带外观与发布状态", async () => {
    await renderForms();
    editIn("English");
    fireEvent.change(nameInput(), { target: { value: "Example" } });

    saveBasics();

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toEqual({
      site_name: { __i18n: { "zh-CN": "示例站点", en: "Example" } },
      tagline: "一句话标语",
    });
  });

  /** 没动过就没什么可存的，按钮该是灰的——省掉一次无意义的写请求与审计记录。 */
  it("没有改动时保存按钮不可点", async () => {
    await renderForms();
    expect(screen.getAllByRole("button", { name: "保存" })[0]).toBeDisabled();
  });
});

describe("语言", () => {
  it("改动当场给出警告", async () => {
    await renderForms();

    await setPrimaryLocale("English");

    expect(
      screen.getByText(/站点 URL 结构会从「中文」切到「English」/),
    ).toBeInTheDocument();
  });

  /**
   * 纯字符串文案的语言是隐含的（= 当时的主语言）。换主语言时若不先钉住，
   * 那串中文数据一个字节没动，含义却原地变成了英文站名。
   */
  it("把原有文案钉在原主语言下，不让它改姓", async () => {
    await renderForms();

    await setPrimaryLocale("English");

    // 新主语言还没有站名，要另填
    expect(nameInput()).toHaveValue("");
    // 原文完好地留在「中文」名下
    editIn("中文");
    expect(nameInput()).toHaveValue("示例站点");
  });

  it("保存前要再确认一次；不确认就不落库", async () => {
    await renderForms();
    await setPrimaryLocale("English");
    confirmMock.mockResolvedValue(false);

    saveLocale();

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(mutateMock).not.toHaveBeenCalled();
  });

  /** 钉好的文案必须和新主语言同一次请求落库，否则中间态是「文案语言已失真」。 */
  it("确认后带着钉好的文案一起提交", async () => {
    await renderForms();
    await setPrimaryLocale("English");

    saveLocale();

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toEqual({
      default_locale: "en",
      site_name: { __i18n: { "zh-CN": "示例站点" } },
      tagline: { __i18n: { "zh-CN": "一句话标语" } },
    });
  });

  it("放弃修改把主语言拨回已保存的那一个", async () => {
    await renderForms();
    await setPrimaryLocale("English");

    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));

    await waitFor(() =>
      expect(screen.getByLabelText("主语言")).toHaveTextContent("中文"),
    );
    // 钉语言也一并撤销：站名回到原来的纯字符串形态
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
