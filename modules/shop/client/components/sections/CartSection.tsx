import type { ReactElement } from "react";

import { sampleShopContext } from "../../lib/shop-sample.js";

import {
  SectionHeading,
  type SectionViewProps,
} from "../../../../../packages/builtin/marketing/client/components/sections/section-parts.js";
import { settingBool, settingText } from "../../../../../packages/builtin/marketing/shared/section-schema.js";

export function CartSection({ section }: SectionViewProps): ReactElement {
  const cart = sampleShopContext().cart!;
  const s = section.settings;

  return (
    <>
      <SectionHeading settings={s} />
      {section.blocks.map((block) => {
        if (block.type === "lines") {
          return (
            <table key={block.id} className="shop-table">
              <thead>
                <tr>
                  <th>{settingText(block.settings, "item_label")}</th>
                  <th>{settingText(block.settings, "qty_label")}</th>
                  <th>{settingText(block.settings, "total_label")}</th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.title}
                      <div className="shop-muted">{item.sku}</div>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{item.line_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        if (block.type === "summary") {
          return (
            <div key={block.id} className="shop-cart-summary">
              <p className="shop-price">
                {settingText(block.settings, "subtotal_label")}: {cart.subtotal}
              </p>
              <p>
                <span className="btn">
                  {settingText(block.settings, "checkout_label")}
                </span>
              </p>
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

export function CartLinkSection({ section }: SectionViewProps): ReactElement {
  const count = sampleShopContext().cart?.item_count ?? 0;
  const label = settingText(section.settings, "label");
  const suffix =
    settingBool(section.settings, "show_count") && count ? ` (${count})` : "";
  return (
    <p className="shop-cart-link">
      <a href="/shop/cart" tabIndex={-1}>
        {label}
        {suffix}
      </a>
    </p>
  );
}
