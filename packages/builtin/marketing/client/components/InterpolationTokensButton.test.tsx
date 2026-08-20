import { registerI18nBundles, setupI18n } from "@rewindom/client-kit";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MARKETING_I18N } from "../i18n.js";
import {
  registerInterpolationToken,
  resetInterpolationTokens,
} from "../../shared/interpolation-tokens.js";

import { InterpolationTokensButton } from "./InterpolationTokensButton.js";

const SHOP = "shop";
const SITE = { site_name: "Acme", tagline: "把散落的线索连成时间线" };

registerI18nBundles([MARKETING_I18N]);

beforeAll(async () => {
  await setupI18n();
});

beforeEach(() => {
  resetInterpolationTokens();
});

function registerProductToken(): void {
  registerInterpolationToken({
    key: "product",
    label: "marketing:editor.token.site",
    page_kinds: ["shop_product"],
    entitlement: SHOP,
  });
}

function open(props: Parameters<typeof InterpolationTokensButton>[0] = {}) {
  render(<InterpolationTokensButton {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /占位符|placeholder/iu }));
}

describe("可用占位符", () => {
  it("列出内置五项，并显示站点级 token 的当前值", () => {
    open({ site: SITE });
    expect(screen.getByText("{site}")).toBeTruthy();
    expect(screen.getByText("{tagline}")).toBeTruthy();
    // 「它会变成什么」是这份清单最要紧的一列
    expect(screen.getByText(`→ ${SITE.site_name}`)).toBeTruthy();
    expect(screen.getByText(`→ ${SITE.tagline}`)).toBeTruthy();
  });

  /*
   * 清单必须说得出「这是什么」——只列一串花括号正是它替代掉的那行提示。
   * 漏了文案时 i18next 会把 key 原样渲染出来，所以直接断言没有 `:` 前缀的原始 key。
   */
  it("每一项都带说明，且没有漏译的原始 key", () => {
    open({ site: SITE });
    expect(screen.queryByText(/^marketing:editor\.token\./u)).toBeNull();
    expect(screen.getByText("站点设置里的标语")).toBeTruthy();
  });

  it("本页专有的 token 在那张页面上列得出", () => {
    registerProductToken();
    open({ pageKind: "shop_product", entitlements: new Set([SHOP]), site: SITE });
    expect(screen.getByText("{product}")).toBeTruthy();
  });

  it("换一张页面就不再列出它", () => {
    registerProductToken();
    open({ pageKind: "page", entitlements: new Set([SHOP]), site: SITE });
    expect(screen.queryByText("{product}")).toBeNull();
  });

  /* 没开通店面的站点不该看见 `{product}`——写下去也永远替不掉 */
  it("未开通的能力不列出它的 token", () => {
    registerProductToken();
    open({ pageKind: "shop_product", site: SITE });
    expect(screen.queryByText("{product}")).toBeNull();
  });

  it("点一行复制 `{token}` 本身", () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    open({ site: SITE });
    fireEvent.click(screen.getByText("{tagline}"));
    expect(writeText).toHaveBeenCalledWith("{tagline}");
  });
});
