import type { AppLocale } from "@be-water/module-sdk";

import { escapeHtml, formatMoney } from "../lib/format.js";

export interface ShopNavLink {
  href: string;
  label: string;
}

export interface ShopPageModel {
  locale: AppLocale;
  title: string;
  description?: string;
  siteName: string;
  cartCount: number;
  member: { email: string } | null;
  notice?: string | null;
  error?: string | null;
  body: string;
}

function t(locale: AppLocale, zh: string, en: string): string {
  return locale === "en" ? en : zh;
}

export function renderShopHtml(model: ShopPageModel): string {
  const cartLabel = t(model.locale, "购物车", "Cart");
  const ordersLabel = t(model.locale, "我的订单", "My orders");
  const loginLabel = t(model.locale, "会员登录", "Sign in");
  const shopLabel = t(model.locale, "商店", "Shop");
  return `<!doctype html>
<html lang="${escapeHtml(model.locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(model.title)} · ${escapeHtml(model.siteName)}</title>
  ${model.description ? `<meta name="description" content="${escapeHtml(model.description)}" />` : ""}
  <style>
    :root { color-scheme: light dark; --fg: #111; --muted: #666; --bg: #fff; --line: #e5e5e5; --accent: #0f766e; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 16px/1.5 system-ui, sans-serif; color: var(--fg); background: var(--bg); }
    a { color: var(--accent); text-decoration: none; }
    header, main, footer { width: min(72rem, 100% - 2rem); margin-inline: auto; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid var(--line); }
    nav { display: flex; gap: 1rem; }
    .muted { color: var(--muted); }
    .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); }
    .card { border: 1px solid var(--line); border-radius: .75rem; padding: 1rem; display: flex; flex-direction: column; gap: .5rem; }
    .price { font-weight: 600; }
    form { display: grid; gap: .75rem; }
    label { display: grid; gap: .25rem; font-size: .875rem; }
    input, select, textarea { font: inherit; padding: .5rem .75rem; border: 1px solid var(--line); border-radius: .5rem; background: var(--bg); color: inherit; }
    button, .btn { display: inline-flex; align-items: center; justify-content: center; padding: .5rem 1rem; border: 0; border-radius: .5rem; background: var(--accent); color: #fff; font: inherit; cursor: pointer; }
    button.secondary { background: transparent; color: var(--fg); border: 1px solid var(--line); }
    .banner { padding: .75rem 1rem; border-radius: .5rem; margin: 1rem 0; }
    .banner.error { background: #fef2f2; color: #991b1b; }
    .banner.notice { background: #ecfdf5; color: #065f46; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: .75rem 0; border-bottom: 1px solid var(--line); }
    .stack { display: grid; gap: 1.25rem; padding: 1.5rem 0 3rem; }
  </style>
</head>
<body>
  <header>
    <a href="/shop"><strong>${escapeHtml(model.siteName)}</strong> · ${escapeHtml(shopLabel)}</a>
    <nav>
      <a href="/shop/cart">${escapeHtml(cartLabel)}${model.cartCount ? ` (${model.cartCount})` : ""}</a>
      ${
        model.member
          ? `<a href="/member/orders">${escapeHtml(ordersLabel)}</a>`
          : `<a href="/member/login?redirect=${encodeURIComponent("/shop")}">${escapeHtml(loginLabel)}</a>`
      }
    </nav>
  </header>
  <main class="stack">
    ${model.error ? `<div class="banner error">${escapeHtml(model.error)}</div>` : ""}
    ${model.notice ? `<div class="banner notice">${escapeHtml(model.notice)}</div>` : ""}
    ${model.body}
  </main>
</body>
</html>`;
}

export function renderUnavailable(title: string, message: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="font:16px/1.5 system-ui;padding:3rem"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></body></html>`;
}

export function productListHtml(params: {
  locale: AppLocale;
  products: Array<{ slug: string; title: string; price: string }>;
}): string {
  if (params.products.length === 0) {
    return `<p class="muted">${t(params.locale, "暂无在售商品。", "No products for sale yet.")}</p>`;
  }
  const cards = params.products
    .map(
      (product) => `<a class="card" href="/shop/${encodeURIComponent(product.slug)}">
        <strong>${escapeHtml(product.title)}</strong>
        <span class="price">${escapeHtml(product.price)}</span>
      </a>`,
    )
    .join("");
  return `<h1>${t(params.locale, "商品", "Products")}</h1><div class="grid">${cards}</div>`;
}

export function productDetailHtml(params: {
  locale: AppLocale;
  title: string;
  description: string;
  variants: Array<{
    id: string;
    label: string;
    price: string;
    stock: number;
  }>;
}): string {
  const options = params.variants
    .map(
      (variant) =>
        `<option value="${escapeHtml(variant.id)}" ${variant.stock < 1 ? "disabled" : ""}>${escapeHtml(variant.label)} — ${escapeHtml(variant.price)}${variant.stock < 1 ? ` (${t(params.locale, "缺货", "Sold out")})` : ""}</option>`,
    )
    .join("");
  return `<article class="stack">
    <h1>${escapeHtml(params.title)}</h1>
    ${params.description ? `<p>${escapeHtml(params.description)}</p>` : ""}
    <form method="post" action="/shop/cart">
      <input type="hidden" name="intent" value="add" />
      <label>${t(params.locale, "规格", "Variant")}
        <select name="variant_id" required>${options}</select>
      </label>
      <label>${t(params.locale, "数量", "Quantity")}
        <input type="number" name="quantity" value="1" min="1" required />
      </label>
      <button type="submit">${t(params.locale, "加入购物车", "Add to cart")}</button>
    </form>
  </article>`;
}

export function cartHtml(params: {
  locale: AppLocale;
  currency: string;
  items: Array<{
    id: string;
    title: string;
    sku: string;
    quantity: number;
    line_total: string;
  }>;
  subtotal: string;
}): string {
  if (params.items.length === 0) {
    return `<h1>${t(params.locale, "购物车", "Cart")}</h1><p class="muted">${t(params.locale, "购物车是空的。", "Your cart is empty.")}</p><p><a href="/shop">${t(params.locale, "去逛逛", "Continue shopping")}</a></p>`;
  }
  const rows = params.items
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.title)}<div class="muted">${escapeHtml(item.sku)}</div></td>
        <td>
          <form method="post" action="/shop/cart">
            <input type="hidden" name="intent" value="update" />
            <input type="hidden" name="item_id" value="${escapeHtml(item.id)}" />
            <input type="number" name="quantity" value="${item.quantity}" min="0" />
            <button class="secondary" type="submit">${t(params.locale, "更新", "Update")}</button>
          </form>
        </td>
        <td>${escapeHtml(item.line_total)}</td>
      </tr>`,
    )
    .join("");
  return `<h1>${t(params.locale, "购物车", "Cart")}</h1>
    <table><thead><tr><th>${t(params.locale, "商品", "Item")}</th><th>${t(params.locale, "数量", "Qty")}</th><th>${t(params.locale, "小计", "Total")}</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="price">${t(params.locale, "合计", "Subtotal")}: ${escapeHtml(params.subtotal)}</p>
    <p><a class="btn" href="/shop/checkout">${t(params.locale, "去结账", "Checkout")}</a></p>`;
}

export function checkoutHtml(params: {
  locale: AppLocale;
  email: string;
  rates: Array<{ id: string; label: string; price: string }>;
  canceled?: boolean;
}): string {
  const rates =
    params.rates.length === 0
      ? `<p class="muted">${t(params.locale, "当前目的地没有可用运费，请先在工作台配置运费表。", "No shipping rates for this destination. Add rates in the workspace.")}</p>`
      : `<label>${t(params.locale, "运费", "Shipping")}
          <select name="shipping_rate_id" required>
            ${params.rates.map((rate) => `<option value="${escapeHtml(rate.id)}">${escapeHtml(rate.label)} — ${escapeHtml(rate.price)}</option>`).join("")}
          </select>
        </label>`;
  return `<h1>${t(params.locale, "结账", "Checkout")}</h1>
    ${params.canceled ? `<div class="banner notice">${t(params.locale, "已取消付款，可以重新提交。", "Payment canceled. You can try again.")}</div>` : ""}
    <form method="post" action="/shop/checkout">
      <label>${t(params.locale, "邮箱", "Email")}<input type="email" name="email" value="${escapeHtml(params.email)}" required /></label>
      <label>${t(params.locale, "收件人", "Name")}<input name="name" required /></label>
      <label>${t(params.locale, "地址", "Address")}<input name="line1" required /></label>
      <label>${t(params.locale, "城市", "City")}<input name="city" required /></label>
      <label>${t(params.locale, "省/州", "State")}<input name="state" /></label>
      <label>${t(params.locale, "邮编", "Postal code")}<input name="postal_code" required /></label>
      <label>${t(params.locale, "国家/地区（ISO 两位）", "Country (ISO-2)")}<input name="country" maxlength="2" required placeholder="US" /></label>
      <label>${t(params.locale, "电话", "Phone")}<input name="phone" /></label>
      ${rates}
      <button type="submit"${params.rates.length === 0 ? " disabled" : ""}>${t(params.locale, "去付款", "Pay")}</button>
    </form>`;
}

export function orderHtml(params: {
  locale: AppLocale;
  currency: string;
  order: {
    number: string;
    status: string;
    email: string;
    total_cents: number;
    subtotal_cents: number;
    shipping_cents: number;
    tax_cents: number;
    pending: boolean;
    shipments: Array<{ carrier_code: string; tracking_number: string }>;
    lines: Array<{ title: string; quantity: number; unit_price_cents: number }>;
  };
}): string {
  const statusLabel = params.order.status;
  const lines = params.order.lines
    .map(
      (line) =>
        `<tr><td>${escapeHtml(line.title)}</td><td>${line.quantity}</td><td>${escapeHtml(formatMoney(line.unit_price_cents * line.quantity, params.currency, params.locale))}</td></tr>`,
    )
    .join("");
  const shipments = params.order.shipments
    .map(
      (item) =>
        `<p>${escapeHtml(item.carrier_code)} · ${escapeHtml(item.tracking_number)}</p>`,
    )
    .join("");
  return `<h1>${t(params.locale, "订单", "Order")} ${escapeHtml(params.order.number)}</h1>
    ${params.order.pending ? `<p class="muted">${t(params.locale, "正在确认付款，请稍候刷新。", "Confirming payment. Refresh in a moment.")}</p>` : ""}
    <p>${t(params.locale, "状态", "Status")}: ${escapeHtml(statusLabel)}</p>
    <table><tbody>${lines}</tbody></table>
    <p>${t(params.locale, "运费", "Shipping")}: ${escapeHtml(formatMoney(params.order.shipping_cents, params.currency, params.locale))}</p>
    <p>${t(params.locale, "税费", "Tax")}: ${escapeHtml(formatMoney(params.order.tax_cents, params.currency, params.locale))}</p>
    <p class="price">${t(params.locale, "合计", "Total")}: ${escapeHtml(formatMoney(params.order.total_cents, params.currency, params.locale))}</p>
    ${shipments}`;
}

export function memberOrdersHtml(params: {
  locale: AppLocale;
  currencyFallback: string;
  orders: Array<{ number: string; status: string; total: string }>;
}): string {
  if (params.orders.length === 0) {
    return `<h1>${t(params.locale, "我的订单", "My orders")}</h1><p class="muted">${t(params.locale, "还没有订单。", "No orders yet.")}</p>`;
  }
  const rows = params.orders
    .map(
      (order) =>
        `<tr><td><a href="/shop/orders/${encodeURIComponent(order.number)}">${escapeHtml(order.number)}</a></td><td>${escapeHtml(order.status)}</td><td>${escapeHtml(order.total)}</td></tr>`,
    )
    .join("");
  return `<h1>${t(params.locale, "我的订单", "My orders")}</h1>
    <table><thead><tr><th>#</th><th>${t(params.locale, "状态", "Status")}</th><th>${t(params.locale, "金额", "Total")}</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}
