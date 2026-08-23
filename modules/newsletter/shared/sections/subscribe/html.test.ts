import { describe, expect, it } from "vitest";

import { renderNewsletterSubscribeHtml } from "./html.js";

import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

function section(settings: Record<string, unknown>): SiteSection {
  return {
    id: "sec-1",
    type: "newsletter.subscribe",
    settings,
    blocks: [],
  } as unknown as SiteSection;
}

const ctx = {} as SectionRenderContext;

describe("订阅段 SSR", () => {
  it("没有按钮文案就整段不渲染", () => {
    // 与事件订阅块同一条口径：没有可主张的就留白，不要出一个空壳表单
    expect(renderNewsletterSubscribeHtml(section({}), ctx)).toBe("");
  });

  it("渲染出真 form 与邮箱输入框", () => {
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅", placeholder: "你的邮箱" }),
      ctx,
    );
    expect(html).toContain('class="newsletter-subscribe"');
    expect(html).toContain('type="email"');
    expect(html).toContain('name="email"');
    expect(html).toContain("required");
  });

  it("list_key 留空仍然写出属性——空串是「本站全部列表」的意思", () => {
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅" }),
      ctx,
    );
    // enhance 脚本读 dataset.listKey；属性缺失与空串在那边是同一个分支，
    // 但写出来能让「这段确实没限定列表」在页面源码里一眼可见
    expect(html).toContain('data-list-key=""');
  });

  it("周期缺省为 weekly", () => {
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅" }),
      ctx,
    );
    expect(html).toContain('data-cadence="weekly"');
  });

  it("转义租户填的文案", () => {
    const html = renderNewsletterSubscribeHtml(
      section({
        submit_label: '"><script>alert(1)</script>',
        hint: "<b>bold</b>",
      }),
      ctx,
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>bold</b>");
  });

  it("带一个 aria-live 容器给增强脚本写回执", () => {
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅" }),
      ctx,
    );
    expect(html).toContain("data-newsletter-message");
    expect(html).toContain('aria-live="polite"');
  });

  it("没有说明文字时不渲染空的提示行", () => {
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅" }),
      ctx,
    );
    expect(html).not.toContain("newsletter-hint");
  });
});
