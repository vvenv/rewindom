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

  it("周期缺省为每日", () => {
    // 事件类内容隔一周再说就不叫「进展」了；没有新内容的那天不会发空信
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅" }),
      ctx,
    );
    expect(html).toContain('data-cadence="daily"');
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

describe("动态列表（当前主题）", () => {
  it("token 已插值时原样用", () => {
    // 聚合层在 SSR 时把 `{topic_slug}` 替成了实际主题
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅", list_key: "events:topic:ai" }),
      ctx,
    );
    expect(html).toContain('data-list-key="events:topic:ai"');
  });

  it("token 没插上就退回「本站全部」，不把解不开的 key 发出去", () => {
    /*
     * 把「当前主题」摆到首页这类没有 topic_slug 的页面上时会走到这里。
     * 原样发出去的话服务端只会回一个 400，读者看到的是「提交失败」。
     */
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅", list_key: "events:topic:{topic_slug}" }),
      ctx,
    );
    expect(html).toContain('data-list-key="newsletter.all"');
    expect(html).not.toContain("{topic_slug}");
  });
});
