/**
 * 邮件正文。
 *
 * 刻意**不做模板编辑器**：先把「发得出、点得开、退得掉」做对。样式内联到极简
 * ——邮件客户端对 CSS 的支持是一片沼泽，Gmail 会剥掉 `<style>`，Outlook 用 Word 引擎排版。
 * 能少写一条规则就少写一条。
 *
 * 每封信都必须带 `List-Unsubscribe` 与 `List-Unsubscribe-Post`：Gmail / Outlook 的
 * 「取消订阅」按钮读的就是它们，这是 2024 年之后批量发信的硬门槛，不是可选项。
 * 缺了它，读者只能点「举报垃圾邮件」，那会直接烧掉发信域的声誉。
 */
import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";

import type { NewsletterItem } from "../shared/index.js";

export interface MailContent {
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}

export function confirmUrl(origin: string, token: string): string {
  return `${origin}/newsletter/confirm?token=${encodeURIComponent(token)}`;
}

export function unsubscribeUrl(origin: string, token: string): string {
  return `${origin}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * 退订信头。
 *
 * `List-Unsubscribe-Post` 让客户端**直接 POST** 完成退订，不必把读者送到浏览器——
 * 也正因为它是 POST，我们的退订页才必须坚持「副作用只在 POST」：
 * 两边口径一致，安全扫描器的 GET 预取不会误退。
 */
function unsubscribeHeaders(url: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

const isZh = (locale: string): boolean => locale.toLowerCase().startsWith("zh");

function shell(bodyHtml: string, footerHtml: string): string {
  return [
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px;margin:0 auto;padding:24px">`,
    bodyHtml,
    `<hr style="border:0;border-top:1px solid #e5e5e5;margin:24px 0" />`,
    `<div style="font-size:12px;color:#777">${footerHtml}</div>`,
    `</div>`,
  ].join("");
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${escapeHtml(href)}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">${escapeHtml(label)}</a></p>`;
}

export function buildConfirmMail(input: {
  locale: string;
  already_confirmed: boolean;
  confirm_token: string | null;
  unsubscribe_token: string;
  site_origin: string;
}): MailContent {
  const zh = isZh(input.locale);
  const unsubUrl = unsubscribeUrl(input.site_origin, input.unsubscribe_token);
  const headers = unsubscribeHeaders(unsubUrl);

  /*
   * 已确认的地址重复提交时发的是「你已经订阅了」，而不是再给一个确认链接。
   * 对外表现与新订阅一模一样（都是 202 + 一封信），所以这个接口不能被拿来
   * 枚举「某个地址是不是本站订阅者」。
   */
  if (input.already_confirmed || !input.confirm_token) {
    const subject = zh ? "你已经订阅了" : "You are already subscribed";
    const line = zh
      ? "这个地址已经在订阅列表里了，不需要再做什么。"
      : "This address is already on the list — nothing further to do.";
    const footer = zh
      ? `不想再收到？<a href="${escapeHtml(unsubUrl)}">一键退订</a>`
      : `Don't want these? <a href="${escapeHtml(unsubUrl)}">Unsubscribe</a>`;
    return {
      subject,
      html: shell(`<p>${line}</p>`, footer),
      text: `${line}\n\n${zh ? "退订" : "Unsubscribe"}: ${unsubUrl}\n`,
      headers,
    };
  }

  const url = confirmUrl(input.site_origin, input.confirm_token);
  const subject = zh ? "请确认订阅" : "Confirm your subscription";
  const line = zh
    ? "点下面的按钮确认订阅。<strong>在你确认之前，我们不会给你发任何内容。</strong>"
    : "Confirm your subscription with the button below. <strong>We will not send you anything until you do.</strong>";
  const ignore = zh
    ? "如果这不是你本人操作，忽略这封信即可，什么都不会发生。"
    : "If this wasn't you, just ignore this email — nothing will happen.";
  const footer = zh
    ? `不想再收到？<a href="${escapeHtml(unsubUrl)}">一键退订</a>`
    : `Don't want these? <a href="${escapeHtml(unsubUrl)}">Unsubscribe</a>`;

  return {
    subject,
    html: shell(
      `<p>${line}</p>${button(url, zh ? "确认订阅" : "Confirm subscription")}<p style="color:#777;font-size:13px">${ignore}</p>`,
      footer,
    ),
    // 纯文本兜底不能省：空正文的多部分邮件会被大量网关直接判成垃圾
    text: `${zh ? "确认订阅" : "Confirm subscription"}: ${url}\n\n${ignore}\n\n${zh ? "退订" : "Unsubscribe"}: ${unsubUrl}\n`,
    headers,
  };
}

export function buildDigestMail(input: {
  locale: string;
  list_label: string;
  items: NewsletterItem[];
  unsubscribe_token: string;
  site_origin: string;
}): MailContent {
  const zh = isZh(input.locale);
  const unsubUrl = unsubscribeUrl(input.site_origin, input.unsubscribe_token);

  const rows = input.items
    .map((item) => {
      const summary = item.summary?.trim()
        ? `<p style="margin:4px 0 0;color:#555;font-size:14px">${escapeHtml(item.summary)}</p>`
        : "";
      return `<li style="margin:0 0 18px"><a href="${escapeHtml(item.url)}" style="color:#111;font-weight:600;text-decoration:none">${escapeHtml(item.title)}</a>${summary}</li>`;
    })
    .join("");

  const subject = zh
    ? `${input.list_label}：${input.items.length} 条新进展`
    : `${input.list_label}: ${input.items.length} new item${input.items.length === 1 ? "" : "s"}`;

  const footer = zh
    ? `你订阅了「${escapeHtml(input.list_label)}」。<a href="${escapeHtml(unsubUrl)}">一键退订</a>`
    : `You subscribed to "${escapeHtml(input.list_label)}". <a href="${escapeHtml(unsubUrl)}">Unsubscribe</a>`;

  const text = [
    subject,
    "",
    ...input.items.map((item) =>
      [item.title, item.url, item.summary?.trim() ?? ""]
        .filter(Boolean)
        .join("\n"),
    ),
    "",
    `${zh ? "退订" : "Unsubscribe"}: ${unsubUrl}`,
    "",
  ].join("\n");

  return {
    subject,
    html: shell(
      `<ul style="list-style:none;padding:0;margin:0">${rows}</ul>`,
      footer,
    ),
    text,
    headers: unsubscribeHeaders(unsubUrl),
  };
}
