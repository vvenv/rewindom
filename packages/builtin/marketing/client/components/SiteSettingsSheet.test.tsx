import { registerI18nBundles, setupI18n } from "@be-water/client-kit";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  const user = userEvent.setup();
  render(
    <SiteSettingsSheet site={value}>
      <button type="button">打开设置</button>
    </SiteSettingsSheet>,
  );
  await user.click(screen.getByRole("button", { name: "打开设置" }));
  await screen.findByLabelText("站点名称");
  return user;
}

const closeButton = () => screen.getByRole("button", { name: "取消" });

beforeEach(() => {
  confirmMock.mockReset();
  confirmMock.mockResolvedValue(true);
  mutateMock.mockReset();
});

describe("SiteSettingsSheet 关闭前的脏检查", () => {
  it("没改过任何东西时直接关闭，不打扰", async () => {
    const user = await openSheet();

    await user.click(closeButton());

    expect(confirmMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByLabelText("站点名称")).not.toBeInTheDocument(),
    );
  });

  it("改过站名后关闭要先确认；点「取消」则留在原地不丢改动", async () => {
    const user = await openSheet();
    await user.type(screen.getByLabelText("站点名称"), "改了");
    confirmMock.mockResolvedValue(false);

    await user.click(closeButton());

    expect(confirmMock).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByLabelText("站点名称")).toHaveValue("示例站点改了"),
    );
  });

  /**
   * 单语言站点存的是纯字符串、多语言站点存的是 `__i18n`。同一份文案换个形状存，
   * 不该被当成"有未保存的改动"。
   */
  it("纯字符串与 __i18n 存着同样的文案时不算改动", async () => {
    const user = await openSheet(
      site({ site_name: { __i18n: { "zh-CN": "示例站点" } } }),
    );

    await user.click(closeButton());

    expect(confirmMock).not.toHaveBeenCalled();
  });
});

describe("SiteSettingsSheet 保存校验", () => {
  it("主语言站名为空时不落库，并把编辑语言切回主语言", async () => {
    const user = await openSheet(site({ site_name: "" }));
    // 切到副语言：此时输入框上的 required 不生效，正是原来能绕过校验的入口
    await user.click(screen.getByRole("button", { name: "English" }));
    await user.type(screen.getByLabelText("站点名称"), "Example");

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(mutateMock).not.toHaveBeenCalled();
    // 切回主语言后输入框展示的是（仍为空的）主语言值
    await waitFor(() =>
      expect(screen.getByLabelText("站点名称")).toHaveValue(""),
    );
  });

  it("副语言译文填好、主语言也有值时正常保存", async () => {
    const user = await openSheet();
    await user.click(screen.getByRole("button", { name: "English" }));
    await user.type(screen.getByLabelText("站点名称"), "Example");

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toMatchObject({
      site_name: { __i18n: { "zh-CN": "示例站点", en: "Example" } },
      default_locale: "zh-CN",
    });
  });
});

describe("SiteSettingsSheet 改主语言", () => {
  async function switchPrimaryLocale() {
    const user = await openSheet();
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "English" }));
    return user;
  }

  it("改动当场给出警告", async () => {
    await switchPrimaryLocale();

    expect(
      screen.getByText(/站点 URL 结构会从「中文」切到「English」/),
    ).toBeInTheDocument();
  });

  it("保存前要再确认一次；不确认就不落库", async () => {
    const user = await switchPrimaryLocale();
    confirmMock.mockResolvedValue(false);

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(confirmMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mutateMock).not.toHaveBeenCalled());
  });

  it("确认后带上新的 default_locale 落库", async () => {
    const user = await switchPrimaryLocale();

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0]?.[0]).toMatchObject({
      default_locale: "en",
    });
  });
});
