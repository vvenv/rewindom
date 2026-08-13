import type { ReactElement } from "react";

import { sampleShopContext } from "../../lib/shop-sample.js";

import type { ChromeBlockViewProps } from "../../../../../packages/builtin/marketing/client/components/sections/chrome-views.js";
import {
  settingBool,
  settingText,
} from "../../../../../packages/builtin/marketing/shared/section-schema.js";

const CART_ICON = (
  <svg
    className="icon"
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="8" cy="21" r="1" />
    <circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </svg>
);

/** 编辑器预览：页头 / 页脚里的购物车按钮。访客看到的是真实件数。 */
export function CartLinkBlock({ block }: ChromeBlockViewProps): ReactElement {
  const count = sampleShopContext().cart?.item_count ?? 0;
  const label = settingText(block.settings, "label") || "Cart";
  const showCount = settingBool(block.settings, "show_count") && count > 0;
  return (
    <a className="btn btn-ghost shop-cart-link" href="/shop/cart" tabIndex={-1}>
      {CART_ICON}
      <span>{label}</span>
      {showCount ? <span className="shop-cart-count">{count}</span> : null}
    </a>
  );
}
