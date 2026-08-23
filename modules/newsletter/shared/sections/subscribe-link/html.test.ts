import { describe, expect, it } from "vitest";

import { renderNewsletterSubscribeBlockHtml } from "./html.js";

import type { SiteBlock } from "@rewindom/builtin/marketing/shared/section-schema.js";

function block(settings: Record<string, unknown>): SiteBlock {
  return {
    id: "blk-1",
    type: "newsletter.subscribe-link",
    settings,
  } as unknown as SiteBlock;
}

const input = {} as never;

describe("订阅入口 chrome 块", () => {
  it("没有去处就整块不渲染", () => {
    // 出一个点了没反应的按钮，比不出这个按钮更糟
    expect(
      renderNewsletterSubscribeBlockHtml(block({ label: "订阅" }), input),
    ).toBe("");
  });

  it("没有文案也不渲染", () => {
    expect(
      renderNewsletterSubscribeBlockHtml(block({ href: "/subscribe" }), input),
    ).toBe("");
  });

  it("挂 chrome-control：尺寸交给页头/页脚的 token", () => {
    const html = renderNewsletterSubscribeBlockHtml(
      block({ label: "订阅", href: "/subscribe" }),
      input,
    );
    expect(html).toContain('class="chrome-control newsletter-subscribe-link"');
    expect(html).toContain('href="/subscribe"');
    expect(html).toContain("<span>订阅</span>");
  });

  it("只显示图标时必须补 aria-label", () => {
    /*
     * 图标本身是 aria-hidden，文字又被藏了——不补 aria-label 的话，
     * 这个链接对读屏软件就是一个没有名字的控件。
     */
    const html = renderNewsletterSubscribeBlockHtml(
      block({ label: "订阅", href: "/subscribe", icon_only: true }),
      input,
    );
    expect(html).toContain('aria-label="订阅"');
    expect(html).not.toContain("<span>订阅</span>");
  });

  it("icon_only 缺键时显示文字（失效方向是安全的）", () => {
    // settingBool 严格 === true；写成 show_label 的话缺键会默默变成没文字的按钮
    const html = renderNewsletterSubscribeBlockHtml(
      block({ label: "订阅", href: "/subscribe" }),
      input,
    );
    expect(html).toContain("<span>订阅</span>");
  });

  it("转义租户填的文案与地址", () => {
    const html = renderNewsletterSubscribeBlockHtml(
      block({ label: '"><script>x</script>', href: '/a"onmouseover="y' }),
      input,
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('onmouseover="y');
  });
});
