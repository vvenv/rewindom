import { describe, expect, it } from "vitest";

import { emptyEventsContext, eventsContextEntry } from "../events-section-context.js";
import { EVENTS_SUBSCRIBE_BLOCK_TYPE } from "../events-subscribe-block.js";
import {
  renderEventsSubscribeBlockHtml,
  renderEventsSubscribeHtml,
} from "./subscribe-html.js";

import type { EventsRenderContext } from "../events-section-context.js";
import type { SiteBlock } from "@rewindom/builtin/marketing/shared/section-schema.js";

function block(settings: Record<string, unknown> = {}): SiteBlock {
  return {
    id: "b-sub",
    type: EVENTS_SUBSCRIBE_BLOCK_TYPE,
    settings: { label: "订阅 RSS", ...settings },
  } as SiteBlock;
}

function render(
  context: Partial<EventsRenderContext> | null = {},
  settings: Record<string, unknown> = {},
) {
  return renderEventsSubscribeBlockHtml(block(settings), {
    contributed: context ? eventsContextEntry(emptyEventsContext(context)) : undefined,
  });
}

describe("订阅入口 · chrome 块", () => {
  it("默认指向全站 feed", () => {
    expect(render()).toContain('href="/events/feed.xml"');
  });

  /*
   * chrome 块拿得到 contributed，所以站点级的常驻入口也能做到
   * 「读者在哪一页，就订阅哪一页对应的东西」。
   */
  it("枢纽带 topic 时跟着走", () => {
    expect(render({ topic: "ai" })).toContain('href="/events/ai/feed.xml"');
  });

  it("查询列表页按当前查询的 topic 取地址", () => {
    expect(render({ listing: { source: "rising", topic: "world" } })).toContain(
      'href="/events/world/feed.xml"',
    );
  });

  it("实体页上指向该实体的 feed，不会指错", () => {
    expect(
      render({
        entity: {
          slug: "openai-abc123",
          href: "/events/entities/openai-abc123",
          feed_href: "/events/entities/openai-abc123/feed.xml",
          name: "OpenAI",
          kind_label: "公司",
          event_count: 2,
          events: [],
        },
      }),
    ).toContain('href="/events/entities/openai-abc123/feed.xml"');
  });

  /* 没有事件上下文的普通页面（比如「关于我们」）仍然给全站 feed，不能崩。 */
  it("没有事件上下文时回落到全站 feed", () => {
    expect(render(null)).toContain('href="/events/feed.xml"');
  });

  it("标注 application/rss+xml，让浏览器与阅读器扩展认得出", () => {
    expect(render()).toContain('type="application/rss+xml"');
  });

  /*
   * 尺寸走 marketing 的 `--chrome-control-*`，所以必须挂上这个 class。
   * 贡献 CSS 拼在后面，自己写 2rem 会把页脚密度盖掉。
   */
  it("挂 chrome-control，尺寸跟页头工具栏 / 页脚版权走同一套 token", () => {
    expect(render()).toContain('class="chrome-control events-subscribe"');
  });

  it("没有文案时整块不渲染", () => {
    expect(render({}, { label: "" })).toBe("");
  });

  it("文案转义，不让设置带出标签", () => {
    expect(render({}, { label: "<b>x</b>" })).not.toContain("<b>x</b>");
  });
});

describe("chrome 块的「仅显示图标」", () => {
  /*
   * 用 icon_only 而不是 show_label：`settingBool` 是严格 `=== true`，
   * 键缺失一律当 false。写成 show_label 的话，任何缺这个键的存量块都会
   * 默默变成没有文字的按钮——失效方向必须是安全的那一侧。
   */
  it("设置缺失时显示文字（失效安全）", () => {
    expect(render()).toContain("<span>订阅 RSS</span>");
  });

  it("打开后只剩图标", () => {
    const html = render({}, { icon_only: true });
    expect(html).not.toContain("<span>订阅 RSS</span>");
    expect(html).toContain("<svg");
  });

  /*
   * 只剩图标的链接对读屏软件是**空的**——图标本身已经 aria-hidden。
   * 不补 aria-label 就等于给了一个没有名字的链接。
   */
  it("只剩图标时补上 aria-label，否则读屏软件读到的是一个空链接", () => {
    expect(render({}, { icon_only: true })).toContain('aria-label="订阅 RSS"');
  });

  it("显示文字时不重复加 aria-label", () => {
    expect(render()).not.toContain("aria-label=");
  });

  it("两种形态都带 title，鼠标悬停能看出是什么", () => {
    expect(render()).toContain('title="订阅 RSS"');
    expect(render({}, { icon_only: true })).toContain('title="订阅 RSS"');
  });
});

describe("订阅入口 · 页面段", () => {
  const renderSection = (
    context: Record<string, unknown> = {},
    settings: Record<string, unknown> = {},
  ) =>
    renderEventsSubscribeHtml(
      {
        id: "s",
        type: "events.subscribe",
        settings: { label: "订阅 RSS", hint: "", ...settings },
      } as never,
      {
        contributed: eventsContextEntry(emptyEventsContext(context as never)),
      } as never,
    );

  /* 段与 chrome 块共用取址逻辑——「订阅哪个 feed」只该有一份判断。 */
  it("与 chrome 块用同一份取址逻辑", () => {
    expect(renderSection({ topic: "ai" })).toContain(
      'href="/events/ai/feed.xml"',
    );
  });

  /* 段在正文流里，放得下一句说明；chrome 块那一排放不下。 */
  it("可以带一句说明", () => {
    expect(renderSection({}, { hint: "不需要注册账号" })).toContain(
      "不需要注册账号",
    );
  });

  it("同样挂 chrome-control——正文流里没有区域 token，回落到工具栏尺寸", () => {
    expect(renderSection()).toContain('class="chrome-control events-subscribe"');
  });

  it("没有文案时整块不渲染", () => {
    expect(renderSection({}, { label: "" })).toBe("");
  });
});
