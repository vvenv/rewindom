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

/** 实站与预览两端都会填的成品文案表（`buildNewsletterSectionLabels` 的形状）。 */
const withLabels = (labels: {
  scopes?: Record<string, string>;
  cadences?: Record<string, string>;
}) =>
  ({
    contributed: {
      newsletter: {
        labels: {
          scopes: labels.scopes ?? {},
          cadences: labels.cadences ?? {},
        },
      },
    },
  }) as never;

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

describe("默认锚点", () => {
  it("新建的订阅段自带 anchor=subscribe，首屏按钮能直接跳过来", async () => {
    const { createSection } =
      await import("@rewindom/builtin/marketing/shared/section-schema.js");
    const { registerSiteSectionHtml } =
      await import("@rewindom/builtin/marketing/shared/sections/html.js");
    const { newsletterSubscribeSection } = await import("./definition.js");
    registerSiteSectionHtml(
      newsletterSubscribeSection,
      renderNewsletterSubscribeHtml,
    );

    const created = createSection("newsletter.subscribe" as never);
    // 锚点由 renderSectionHtml 输出成 <section id>，这里只查它确实落进了 settings
    expect(created.settings.anchor).toBe("subscribe");
  });
});

describe("主题页订阅当前主题（端到端）", () => {
  it("{topic_slug} 经聚合层插值后落进 data-list-key", async () => {
    /*
     * 整条链：段设置里存 `events:topic:{topic_slug}` → `renderSectionHtml` 按
     * ctx.interpolation 替掉 → 渲染器写进 data-list-key → enhance 脚本原样提交。
     *
     * `select` 类型是后来才加进聚合层插值类型表的，就是为了这一条；漏了的话
     * 主题页上的订阅框会把 `events:topic:{topic_slug}` 原样发给服务端换一个 400。
     */
    const { registerSiteSectionHtml, renderSectionHtml } =
      await import("@rewindom/builtin/marketing/shared/sections/html.js");
    const { newsletterSubscribeSection } = await import("./definition.js");
    registerSiteSectionHtml(
      newsletterSubscribeSection,
      renderNewsletterSubscribeHtml,
    );

    const html = renderSectionHtml(
      section({
        submit_label: "订阅",
        list_key: "events:topic:{topic_slug}",
      }),
      0,
      // entitlement 闸门：未开通的租户什么都不输出，测试里要显式开通
      {
        interpolation: { topic_slug: "ai" },
        enabledEntitlements: new Set(["newsletter"]),
      } as never,
    );

    expect(html).toContain('data-list-key="events:topic:ai"');
    expect(html).not.toContain("{topic_slug}");
  });

  it("同一段摆到没有 topic 的页面上，退回「本站全部」", async () => {
    const { renderSectionHtml } =
      await import("@rewindom/builtin/marketing/shared/sections/html.js");
    const html = renderSectionHtml(
      section({
        submit_label: "订阅",
        list_key: "events:topic:{topic_slug}",
      }),
      0,
      { enabledEntitlements: new Set(["newsletter"]) } as never,
    );
    expect(html).toContain('data-list-key="newsletter.all"');
  });
});

describe("订阅页按 URL 指定范围", () => {
  const withScope = (scope: unknown) =>
    ({
      contributed: { newsletter: { subscribe: scope } },
    }) as never;

  it("URL 指定的范围盖过段设置里的默认值", () => {
    /*
     * `/subscribe?list=events:topic:ai` —— 读者的意图明确写在地址里，
     * 比站长在段上配的默认更具体。
     */
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅", list_key: "newsletter.all" }),
      withScope({ list_key: "events:topic:ai", scope_label: "订阅范围：AI" }),
    );
    expect(html).toContain('data-list-key="events:topic:ai"');
    expect(html).not.toContain('data-list-key="newsletter.all"');
  });

  it("把这一次订的是什么写在表单上", () => {
    // 不说清楚的话，读者会以为自己订了全站
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅" }),
      withScope({ list_key: "events:topic:ai", scope_label: "订阅范围：AI" }),
    );
    expect(html).toContain("订阅范围：AI");
    expect(html).toContain("newsletter-meta-scope");
  });

  it("没有 URL 范围时用段设置里选的那一档，说明照样出", () => {
    /*
     * 这一行不是「被带参数链过来时才有」的东西：段设置里选了「科技」，
     * 读者也得知道自己订的是科技而不是全站。
     */
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅", list_key: "events:topic:tech" }),
      withLabels({ scopes: { "events:topic:tech": "订阅范围：科技" } }),
    );
    expect(html).toContain('data-list-key="events:topic:tech"');
    expect(html).toContain("订阅范围：科技");
  });

  it("转义范围文案——它最终来自内容源", () => {
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅" }),
      withScope({ list_key: "x:y", scope_label: '<img src=x onerror="a">' }),
    );
    expect(html).not.toContain("<img src=x");
  });
});

describe("scope 名字解不出时", () => {
  it("不出空的「订阅：」那一行", () => {
    // 实体被删了、或源查不动时会走到这里；范围仍生效，只是少一行说明
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅" }),
      {
        contributed: {
          newsletter: {
            subscribe: { list_key: "events:entity:x", scope_label: "" },
          },
        },
      } as never,
    );
    expect(html).toContain('data-list-key="events:entity:x"');
    expect(html).not.toContain("newsletter-meta-scope");
  });
});

describe("表单下面那一行说明", () => {
  const ALL = "newsletter.all";

  it("默认（全站 + 每日）也写出来——读者没有别的地方能知道这两件事", () => {
    /*
     * 周期是**租户在段设置里定的**，表单上没有可选项。不写出来的话，
     * 读者按下「订阅」时并不知道自己会多久收到一封信。
     */
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅" }),
      withLabels({
        scopes: { [ALL]: "订阅范围：本站全部更新" },
        cadences: { daily: "每天一封摘要" },
      }),
    );
    expect(html).toContain("订阅范围：本站全部更新");
    expect(html).toContain("每天一封摘要");
  });

  it("周期跟着段设置走", () => {
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅", cadence: "weekly" }),
      withLabels({
        cadences: { daily: "每天一封摘要", weekly: "每周一封摘要" },
      }),
    );
    expect(html).toContain("每周一封摘要");
    expect(html).not.toContain("每天一封摘要");
  });

  it("URL 指定的范围盖过表里那一条", () => {
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅", list_key: ALL }),
      {
        contributed: {
          newsletter: {
            subscribe: {
              list_key: "events:topic:ai",
              scope_label: "订阅范围：AI",
            },
            labels: {
              scopes: { [ALL]: "订阅范围：本站全部更新" },
              cadences: {},
            },
          },
        },
      } as never,
    );
    expect(html).toContain("订阅范围：AI");
    expect(html).not.toContain("本站全部更新");
  });

  it("动态 key 没解开时按「全站」查表，不把 `{token}` 显示给读者", () => {
    // 「当前主题」被摆到了没有主题的页面上
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅", list_key: "events:topic:{topic_slug}" }),
      withLabels({ scopes: { [ALL]: "订阅范围：本站全部更新" } }),
    );
    expect(html).toContain("订阅范围：本站全部更新");
    expect(html).not.toContain("{topic_slug}");
  });

  it("没有文案表（预览拉不到候选）就整行不画", () => {
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅" }),
      ctx,
    );
    expect(html).not.toContain("newsletter-meta");
  });

  it("分隔点对读屏软件隐藏——两段文案本来就各成一句", () => {
    const html = renderNewsletterSubscribeHtml(
      section({ submit_label: "订阅" }),
      withLabels({
        scopes: { [ALL]: "订阅范围：本站全部更新" },
        cadences: { daily: "每天一封摘要" },
      }),
    );
    expect(html).toContain(
      '<span class="newsletter-meta-sep" aria-hidden="true">',
    );
  });
});
