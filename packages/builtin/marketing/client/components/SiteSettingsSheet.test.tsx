import { registerI18nBundles, setupI18n } from "@be-water/client-kit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MARKETING_I18N } from "../i18n.js";

import { SiteSettingsSheet } from "./SiteSettingsSheet.js";

import type { MarketingSite } from "../../shared/site-cms.js";

const confirmMock = vi.fn<(options: unknown) => Promise<boolean>>();
const mutateMock = vi.fn();

vi.mock("@be-water/client-kit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@be-water/client-kit")>()),
  useConfirm: () => ({ confirm: confirmMock }),
}));

vi.mock("../hooks/useSite.js", () => ({
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
    chrome_dirty: false,
    published: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

async function openSheet(value: MarketingSite = site()) {
  render(
    <SiteSettingsSheet site={value}>
      <button type="button">打开设置</button>
    </SiteSettingsSheet>,
  );
  fireEvent.click(screen.getByRole("button", { name: "打开设置" }));
  await screen.findByLabelText("站点名称");
}

const nameInput = () => screen.getByLabelText("站点名称");
const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
const close = () =>
  fireEvent.click(screen.getByRole("button", { name: "取消" }));

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
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
  const option = await screen.findByRole("option", { name: locale });
  fireEvent.keyDown(option, { key: "Enter" });
  await waitFor(() =>
    expect(screen.getByRole("combobox")).toHaveTextContent(locale),
  );
}

beforeEach(() => {
  confirmMock.mockReset();
  confirmMock.mockResolvedValue(true);
  mutateMock.mockReset();
});

describe("SiteSettingsSheet 关闭前的脏检查", () => {
  it("没改过任何东西时直接关闭，不打扰", async () => {
    await openSheet();

    close();

    expect(confirmMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByLabelText("站点名称")).not.toBeInTheDocument(),
    );
  });

  it("改过站名后关闭要先确认；不确认就留在原地，改动还在", async () => {
    await openSheet();
    fireEvent.change(nameInput(), { target: { value: "改过的名字" } });
    confirmMock.mockResolvedValue(false);

    close();

    expect(confirmMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(nameInput()).toHaveValue("改过的名字"));
  });

  /**
   * 单语言站点存纯字符串、多语言站点存 `__i18n`。同一份文案换个形状存，
   * 不该被当成「有未保存的改动」。
   */
  it("纯字符串与 __i18n 存着同样的文案时不算改动", async () => {
    await openSheet(site({ site_name: { __i18n: { "zh-CN": "示例站点" } } }));

    close();

    expect(confirmMock).not.toHaveBeenCalled();
  });
});

describe("SiteSettingsSheet 保存校验", () => {
  it("主语言站名为空时不落库，并把编辑语言切回主语言", async () => {
    await openSheet(site({ site_name: "" }));
    // 切到副语言：此时输入框的 required 不生效，正是原来绕过校验的入口
    editIn("English");
    fireEvent.change(nameInput(), { target: { value: "Example" } });

    save();

    expect(mutateMock).not.toHaveBeenCalled();
    // 切回主语言，展示的是仍然为空的主语言值
    await waitFor(() => expect(nameInput()).toHaveValue(""));
  });

  it("主语言有值时，副语言译文正常落库", async () => {
    await openSheet();
    editIn("English");
    fireEvent.change(nameInput(), { target: { value: "Example" } });

    save();

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toMatchObject({
      site_name: { __i18n: { "zh-CN": "示例站点", en: "Example" } },
      default_locale: "zh-CN",
    });
  });
});

describe("SiteSettingsSheet 改主语言", () => {
  it("改动当场给出警告", async () => {
    await openSheet();

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
    await openSheet();

    await setPrimaryLocale("English");

    // 新主语言还没有站名，要另填
    expect(nameInput()).toHaveValue("");
    // 原文完好地留在「中文」名下
    editIn("中文");
    expect(nameInput()).toHaveValue("示例站点");
  });

  it("换出去又换回来、内容没动，就不算有未保存的改动", async () => {
    await openSheet();

    await setPrimaryLocale("English");
    await setPrimaryLocale("中文");
    close();

    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("保存前要再确认一次；不确认就不落库", async () => {
    await openSheet();
    await setPrimaryLocale("English");
    fireEvent.change(nameInput(), { target: { value: "Example" } });
    confirmMock.mockResolvedValue(false);

    save();

    expect(confirmMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mutateMock).not.toHaveBeenCalled());
  });

  it("确认后带上新的 default_locale，原文钉在旧语言下一起落库", async () => {
    await openSheet();
    await setPrimaryLocale("English");
    fireEvent.change(nameInput(), { target: { value: "Example" } });

    save();

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toMatchObject({
      default_locale: "en",
      site_name: { __i18n: { "zh-CN": "示例站点", en: "Example" } },
      tagline: { __i18n: { "zh-CN": "一句话标语" } },
    });
  });
});
