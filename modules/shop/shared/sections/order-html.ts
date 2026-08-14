import { readShopContext } from "../shop-section-context.js";
import { shopAlertHtml, shopTotalsHtml } from "./html-helpers.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const renderOrderHtml: SectionHtmlRenderer = (section, ctx) => {
  const shop = readShopContext(ctx);
  const order = shop?.order;
  if (!shop || !order) return shop ? shopAlertHtml(shop) : "";
  const s = section.settings;
  const lines = order.lines
    .map(
      (line) =>
        `<li class="shop-line shop-line-plain"><span class="shop-line-title">${escapeHtml(line.title)}</span><span class="shop-muted">× ${line.quantity}</span><span class="shop-line-total">${escapeHtml(line.line_total)}</span></li>`,
    )
    .join("");
  const totals = shopTotalsHtml([
    ...(order.discount
      ? [
          {
            label: `${settingText(s, "discount_label") || "Discount"}${order.discount_code ? ` (${order.discount_code})` : ""}`,
            value: `−${order.discount}`,
            muted: true,
          },
        ]
      : []),
    {
      label: settingText(s, "shipping_label"),
      value: order.shipping,
    },
    {
      label: settingText(s, "tax_label"),
      value: order.tax,
    },
    {
      label: settingText(s, "total_label"),
      value: order.total,
      grand: true,
    },
  ]);
  const meta = [
    order.note
      ? `<p>${escapeHtml(settingText(s, "note_label"))}: ${escapeHtml(order.note)}</p>`
      : "",
    ...order.shipments.map(
      (item) =>
        `<p>${escapeHtml(settingText(s, "tracking_label"))}: ${escapeHtml(item.carrier_code)} · ${escapeHtml(item.tracking_number)}</p>`,
    ),
  ]
    .filter(Boolean)
    .join("");
  return `${shopAlertHtml(shop)}${sectionHeading(s)}
    <div class="shop-order">
      <header class="shop-order-head">
        <div>
          <p class="shop-order-kicker">${escapeHtml(settingText(s, "status_label"))}</p>
          <h1>${escapeHtml(order.number)}</h1>
        </div>
        <span class="shop-status">${escapeHtml(order.status)}</span>
      </header>
      ${order.pending ? `<p class="shop-muted">${escapeHtml(settingText(s, "pending_text"))}</p>` : ""}
      <div class="shop-order-body">
        <ul class="shop-lines">${lines}</ul>
        <aside class="shop-checkout-aside">
          ${totals}
          ${meta ? `<div class="shop-order-meta">${meta}</div>` : ""}
        </aside>
      </div>
    </div>`;
};

export const renderOrderListHtml: SectionHtmlRenderer = (section, ctx) => {
  const shop = readShopContext(ctx);
  if (!shop) return "";
  const s = section.settings;
  const heading = sectionHeading(s);
  if (shop.orders.length === 0) {
    const empty = settingText(s, "empty_text");
    return `${shopAlertHtml(shop)}${heading}${empty ? `<p class="shop-muted">${escapeHtml(empty)}</p>` : ""}`;
  }
  const rows = shop.orders
    .map(
      (order) =>
        `<tr><td><a href="${escapeHtml(siteHref(order.href, ctx))}">${escapeHtml(order.number)}</a></td><td><span class="shop-status">${escapeHtml(order.status)}</span></td><td>${escapeHtml(order.total)}</td></tr>`,
    )
    .join("");
  return `${shopAlertHtml(shop)}${heading}
    <table class="shop-table">
      <thead><tr>
        <th>${escapeHtml(settingText(s, "number_label"))}</th>
        <th>${escapeHtml(settingText(s, "status_label"))}</th>
        <th>${escapeHtml(settingText(s, "total_label"))}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
};

