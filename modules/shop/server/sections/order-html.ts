import { orderListSection, orderSection } from "../../shared/order-section.js";
import { readShopContext } from "../../shared/shop-section-context.js";
import { SHOP_STOREFRONT_CSS } from "../../shared/site-css.generated.js";
import { shopAlertHtml } from "./html-helpers.js";

import { escapeHtml } from "../../../../packages/builtin/marketing/shared/html.js";
import { settingText } from "../../../../packages/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "../../../../packages/builtin/marketing/shared/sections/_common/html.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "../../../../packages/builtin/marketing/shared/sections/html.js";

const renderOrderHtml: SectionHtmlRenderer = (section, ctx) => {
  const shop = readShopContext(ctx);
  const order = shop?.order;
  if (!shop || !order) return shop ? shopAlertHtml(shop) : "";
  const s = section.settings;
  const lines = order.lines
    .map(
      (line) =>
        `<tr><td>${escapeHtml(line.title)}</td><td>${line.quantity}</td><td>${escapeHtml(line.line_total)}</td></tr>`,
    )
    .join("");
  const shipments = order.shipments
    .map(
      (item) =>
        `<p>${escapeHtml(settingText(s, "tracking_label"))}: ${escapeHtml(item.carrier_code)} · ${escapeHtml(item.tracking_number)}</p>`,
    )
    .join("");
  return `${shopAlertHtml(shop)}${sectionHeading(s)}
    ${order.pending ? `<p class="shop-muted">${escapeHtml(settingText(s, "pending_text"))}</p>` : ""}
    <p>${escapeHtml(settingText(s, "status_label"))}: ${escapeHtml(order.status)}</p>
    <h1>${escapeHtml(order.number)}</h1>
    <table class="shop-table"><tbody>${lines}</tbody></table>
    <div class="shop-totals">
      ${order.discount ? `<p>${escapeHtml(settingText(s, "discount_label") || "Discount")}${order.discount_code ? ` (${escapeHtml(order.discount_code)})` : ""}: −${escapeHtml(order.discount)}</p>` : ""}
      <p>${escapeHtml(settingText(s, "shipping_label"))}: ${escapeHtml(order.shipping)}</p>
      <p>${escapeHtml(settingText(s, "tax_label"))}: ${escapeHtml(order.tax)}</p>
      <p class="shop-price">${escapeHtml(settingText(s, "total_label"))}: ${escapeHtml(order.total)}</p>
    </div>
    ${order.note ? `<p>${escapeHtml(settingText(s, "note_label"))}: ${escapeHtml(order.note)}</p>` : ""}
    ${shipments}`;
};

const renderOrderListHtml: SectionHtmlRenderer = (section, ctx) => {
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
        `<tr><td><a href="${escapeHtml(order.href)}">${escapeHtml(order.number)}</a></td><td>${escapeHtml(order.status)}</td><td>${escapeHtml(order.total)}</td></tr>`,
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

export function registerOrderSections(): void {
  registerSiteSectionHtml(orderSection, renderOrderHtml, {
    css: SHOP_STOREFRONT_CSS,
  });
  registerSiteSectionHtml(orderListSection, renderOrderListHtml, {
    css: SHOP_STOREFRONT_CSS,
  });
}
