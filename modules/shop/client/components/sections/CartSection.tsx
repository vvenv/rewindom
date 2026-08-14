import type { ReactElement } from "react";

import { sampleShopContext } from "../../lib/shop-sample.js";

import {
  SectionHeading,
  type SectionViewProps,
} from "@rewindom/builtin/marketing/client/components/sections/section-parts.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";

export function CartSection({ section }: SectionViewProps): ReactElement {
  const cart = sampleShopContext().cart!;
  const s = section.settings;
  const lines = section.blocks.find((block) => block.type === "lines");
  const summary = section.blocks.find((block) => block.type === "summary");

  return (
    <>
      <SectionHeading settings={s} />
      <div className="shop-cart">
        {lines ? (
          <ul className="shop-lines">
            {cart.items.map((item) => (
              <li key={item.id} className="shop-line">
                <span className="shop-line-media" aria-hidden />
                <div className="shop-line-body">
                  <div className="shop-line-top">
                    <div>
                      <div className="shop-line-title">{item.title}</div>
                      <p className="shop-line-sku">{item.sku}</p>
                    </div>
                    <div className="shop-line-total">{item.line_total}</div>
                  </div>
                  <form className="shop-qty">
                    <input
                      type="number"
                      defaultValue={item.quantity}
                      min={0}
                      tabIndex={-1}
                      readOnly
                      aria-label={settingText(lines.settings, "qty_label")}
                    />
                    <button className="btn btn-secondary" type="button" tabIndex={-1}>
                      {settingText(lines.settings, "update_label")}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {summary ? (
          <div className="shop-cart-summary">
            <dl className="shop-totals">
              <div>
                <dt>{settingText(summary.settings, "subtotal_label")}</dt>
                <dd>{cart.subtotal}</dd>
              </div>
            </dl>
            <span className="btn shop-cta">
              {settingText(summary.settings, "checkout_label")}
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}
