import { describe, expect, it } from "vitest";

import { renderUselessListHtml } from "./html.js";

import type { UselessRenderContext } from "../../useless-section-context.js";
import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";
import {
  localizeSettingValues,
  type SiteSection,
} from "@rewindom/builtin/marketing/shared/section-schema.js";

function section(settings: Record<string, unknown> = {}): SiteSection {
  return {
    id: "sec-1",
    type: "useless.list",
    settings: { columns: 3, ...settings },
    blocks: [],
  } as unknown as SiteSection;
}

const emptyCtx = {} as SectionRenderContext;

function ctxWith(patch: Partial<UselessRenderContext>) {
  const base: UselessRenderContext = {
    things: [],
    thing: null,
    labels: { empty: "还没有。" },
  };
  return { contributed: { useless: { ...base, ...patch } } } as never;
}

const embed = (
  patch: Partial<UselessRenderContext["things"][number]> = {},
): UselessRenderContext["things"][number] => ({
  kind: "embed",
  slug: "clock",
  href: "/clock",
  title: "时钟在撒谎",
  text: "",
  html: "<canvas></canvas>",
  thumbnail: "",
  ...patch,
});

describe("无用之物列表", () => {
  it("池子空时出空态文案", () => {
    const html = renderUselessListHtml(section(), ctxWith({ things: [] }));
    expect(html).toContain("还没有。");
  });

  it("租户填了 empty_text 就用租户的", () => {
    const html = renderUselessListHtml(
      section({ empty_text: "一个都没有。" }),
      ctxWith({ things: [] }),
    );
    expect(html).toContain("一个都没有。");
  });

  it("每一件一张卡片，链到详情", () => {
    const html = renderUselessListHtml(
      section(),
      ctxWith({ things: [embed()] }),
    );
    expect(html).toContain('href="/clock"');
    expect(html).toContain("useless-card");
  });

  it("有截图就用 <img>，不把可交互物再跑一遍", () => {
    const html = renderUselessListHtml(
      section(),
      ctxWith({
        things: [embed({ thumbnail: "https://cdn.example/clock.png" })],
      }),
    );
    expect(html).toContain('src="https://cdn.example/clock.png"');
    expect(html).toContain("useless-thumb-img");
    expect(html).not.toContain("<canvas");
  });

  it("没有截图就把可交互物自己缩小放进格子", () => {
    const html = renderUselessListHtml(
      section(),
      ctxWith({ things: [embed()] }),
    );
    expect(html).toContain("<canvas></canvas>");
    expect(html).toContain('class="useless-thing"');
  });

  it("名字不进可见 DOM —— 访客自己去摸", () => {
    const html = renderUselessListHtml(
      section(),
      ctxWith({ things: [embed()] }),
    );
    const visible = html.replace(/aria-label="[^"]*"/g, "");
    expect(visible).not.toContain("时钟在撒谎");
  });

  it("有标题才画抬头", () => {
    const html = renderUselessListHtml(
      section({ heading: "无用" }),
      ctxWith({ things: [embed()] }),
    );
    expect(html).toContain("<h2>无用</h2>");
  });

  it("租户清空当前语言标题就不画抬头，不借另一门语言", () => {
    const settings = localizeSettingValues(
      { heading: { __i18n: { "zh-CN": "", en: "Useless" } }, columns: 3 },
      "zh-CN",
      "zh-CN",
    );
    const html = renderUselessListHtml(
      section(settings),
      ctxWith({ things: [embed()] }),
    );
    expect(html).not.toContain("sec-head");
    expect(html).not.toContain("Useless");
  });

  it("上下文缺失时不崩，只出空态", () => {
    const html = renderUselessListHtml(
      section({ empty_text: "还没有。" }),
      emptyCtx,
    );
    expect(html).toContain("还没有。");
    expect(html).not.toContain("useless-card");
  });
});
