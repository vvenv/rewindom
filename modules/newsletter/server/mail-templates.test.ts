import { describe, expect, it } from "vitest";

import { buildConfirmMail, buildDigestMail } from "./mail-templates.js";

import type { NewsletterItem } from "../shared/index.js";

const ORIGIN = "https://acme.example.com";
const UNSUB = "unsub-token-123";

const items: NewsletterItem[] = [
  {
    id: "e1",
    title: "Acme 发布了新版本",
    url: `${ORIGIN}/events/acme-ships-v2`,
    summary: "顺带修了那个所有人都在骂的 bug",
    published_at: "2026-08-20T10:00:00.000Z",
  },
];

describe("退订信头", () => {
  /*
   * 这一条是硬门槛，不是锦上添花：Gmail / Outlook 的「取消订阅」按钮读的就是这两个头。
   * 缺了它，读者只能点「举报垃圾邮件」，那会直接烧掉发信域的声誉。
   */
  it.each([
    [
      "确认信",
      buildConfirmMail({
        locale: "zh-CN",
        already_confirmed: false,
        confirm_token: "c-token",
        unsubscribe_token: UNSUB,
        site_origin: ORIGIN,
      }),
    ],
    [
      "摘要信",
      buildDigestMail({
        locale: "zh-CN",
        list_label: "AI 事件",
        items,
        unsubscribe_token: UNSUB,
        site_origin: ORIGIN,
      }),
    ],
  ])("%s 带 List-Unsubscribe 与一键退订头", (_name, mail) => {
    expect(mail.headers["List-Unsubscribe"]).toBe(
      `<${ORIGIN}/newsletter/unsubscribe?token=${UNSUB}>`,
    );
    expect(mail.headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
  });

  it("纯文本兜底非空", () => {
    // 空正文的多部分邮件会被大量网关直接判成垃圾
    const mail = buildDigestMail({
      locale: "en",
      list_label: "AI",
      items,
      unsubscribe_token: UNSUB,
      site_origin: ORIGIN,
    });
    expect(mail.text.trim().length).toBeGreaterThan(0);
    expect(mail.text).toContain(items[0]!.url);
    expect(mail.text).toContain("/newsletter/unsubscribe?token=");
  });
});

describe("buildConfirmMail", () => {
  it("新订阅给出确认链接", () => {
    const mail = buildConfirmMail({
      locale: "zh-CN",
      already_confirmed: false,
      confirm_token: "c-token",
      unsubscribe_token: UNSUB,
      site_origin: ORIGIN,
    });
    expect(mail.html).toContain(`${ORIGIN}/newsletter/confirm?token=c-token`);
    expect(mail.text).toContain("c-token");
  });

  it("已确认的地址不再发出任何确认 token", () => {
    /*
     * 重复提交时发的是「你已经订阅了」。对外表现与新订阅一模一样（都是 202 + 一封信），
     * 所以这个接口不能被拿来枚举「某个地址是不是本站订阅者」——但信里绝不能带
     * 一个能让别人替他确认的 token。
     */
    const mail = buildConfirmMail({
      locale: "zh-CN",
      already_confirmed: true,
      confirm_token: "should-not-appear",
      unsubscribe_token: UNSUB,
      site_origin: ORIGIN,
    });
    expect(mail.html).not.toContain("should-not-appear");
    expect(mail.text).not.toContain("should-not-appear");
    expect(mail.html).not.toContain("/newsletter/confirm");
  });

  it("token 缺失时退化成「已订阅」而不是发出坏链接", () => {
    const mail = buildConfirmMail({
      locale: "en",
      already_confirmed: false,
      confirm_token: null,
      unsubscribe_token: UNSUB,
      site_origin: ORIGIN,
    });
    expect(mail.html).not.toContain("/newsletter/confirm");
  });

  it("按语言切换文案", () => {
    const zh = buildConfirmMail({
      locale: "zh-CN",
      already_confirmed: false,
      confirm_token: "t",
      unsubscribe_token: UNSUB,
      site_origin: ORIGIN,
    });
    const en = buildConfirmMail({
      locale: "en-US",
      already_confirmed: false,
      confirm_token: "t",
      unsubscribe_token: UNSUB,
      site_origin: ORIGIN,
    });
    expect(zh.subject).not.toBe(en.subject);
  });
});

describe("buildDigestMail", () => {
  it("条目链接原样进正文（必须是绝对地址）", () => {
    const mail = buildDigestMail({
      locale: "zh-CN",
      list_label: "AI 事件",
      items,
      unsubscribe_token: UNSUB,
      site_origin: ORIGIN,
    });
    expect(mail.html).toContain(items[0]!.url);
    expect(mail.subject).toContain("AI 事件");
  });

  it("转义标题里的 HTML，外部来源什么都可能有", () => {
    const mail = buildDigestMail({
      locale: "en",
      list_label: "News",
      items: [{ ...items[0]!, title: '<img src=x onerror="alert(1)">' }],
      unsubscribe_token: UNSUB,
      site_origin: ORIGIN,
    });
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&lt;img");
  });
});
