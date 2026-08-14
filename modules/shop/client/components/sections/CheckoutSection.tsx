import type { ReactElement } from "react";

import { sampleShopContext } from "../../lib/shop-sample.js";

import {
  SectionHeading,
  type SectionViewProps,
} from "@rewindom/builtin/marketing/client/components/sections/section-parts.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";

function Field({
  id,
  label,
  type = "text",
}: {
  id: string;
  label: string;
  type?: string;
}): ReactElement {
  return (
    <div className="shop-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} tabIndex={-1} readOnly />
    </div>
  );
}

export function CheckoutSection({ section }: SectionViewProps): ReactElement {
  const checkout = sampleShopContext().checkout!;
  const cart = sampleShopContext().cart!;
  const summary = section.blocks.find((block) => block.type === "summary");
  const rest = section.blocks.filter((block) => block.type !== "summary");

  return (
    <>
      <SectionHeading settings={section.settings} />
      <div className="shop-checkout">
        <div className="shop-checkout-main">
          {rest.map((block) => {
            if (block.type === "contact") {
              return (
                <div key={block.id} className="shop-group">
                  {settingText(block.settings, "heading") ? (
                    <h3 className="shop-block-head">
                      {settingText(block.settings, "heading")}
                    </h3>
                  ) : null}
                  <Field
                    id="preview-email"
                    label={settingText(block.settings, "email_label")}
                    type="email"
                  />
                </div>
              );
            }
            if (block.type === "address") {
              const s = block.settings;
              return (
                <div key={block.id} className="shop-group">
                  {settingText(s, "heading") ? (
                    <h3 className="shop-block-head">{settingText(s, "heading")}</h3>
                  ) : null}
                  <Field id="preview-name" label={settingText(s, "name_label")} />
                  <Field id="preview-line1" label={settingText(s, "line1_label")} />
                  <div className="shop-field-row">
                    <Field id="preview-city" label={settingText(s, "city_label")} />
                    <Field id="preview-state" label={settingText(s, "state_label")} />
                  </div>
                  <div className="shop-field-row">
                    <Field id="preview-postal" label={settingText(s, "postal_label")} />
                    <Field id="preview-country" label={settingText(s, "country_label")} />
                  </div>
                  <Field
                    id="preview-phone"
                    label={settingText(s, "phone_label")}
                    type="tel"
                  />
                </div>
              );
            }
            if (block.type === "shipping") {
              return (
                <div key={block.id} className="shop-group">
                  {settingText(block.settings, "heading") ? (
                    <h3 className="shop-block-head">
                      {settingText(block.settings, "heading")}
                    </h3>
                  ) : null}
                  <div className="shop-rates">
                    {checkout.rates.map((rate, index) => (
                      <label key={rate.id} className="shop-rate">
                        <input
                          type="radio"
                          name="preview-rate"
                          defaultChecked={index === 0}
                          tabIndex={-1}
                          disabled
                        />
                        <span className="shop-rate-label">{rate.label}</span>
                        <span className="shop-rate-price">{rate.price}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            }
            if (block.type === "note") {
              return (
                <div key={block.id} className="shop-group">
                  {settingText(block.settings, "heading") ? (
                    <h3 className="shop-block-head">
                      {settingText(block.settings, "heading")}
                    </h3>
                  ) : null}
                  <div className="shop-field">
                    <label htmlFor="preview-note">
                      {settingText(block.settings, "note_label")}
                    </label>
                    <textarea id="preview-note" rows={3} tabIndex={-1} readOnly />
                  </div>
                </div>
              );
            }
            if (block.type === "pay") {
              return (
                <div key={block.id} className="shop-pay">
                  <button className="btn shop-cta" type="button" tabIndex={-1}>
                    {settingText(block.settings, "submit_label")}
                  </button>
                </div>
              );
            }
            return null;
          })}
        </div>
        {summary ? (
          <aside className="shop-checkout-aside">
            {settingText(summary.settings, "heading") ? (
              <h3 className="shop-block-head">
                {settingText(summary.settings, "heading")}
              </h3>
            ) : null}
            <div className="shop-aside-lines">
              {cart.items.map((item) => (
                <div key={item.id} className="shop-aside-line">
                  <span>
                    {item.title} <span className="shop-muted">× {item.quantity}</span>
                  </span>
                  <span>{item.line_total}</span>
                </div>
              ))}
            </div>
            <dl className="shop-totals">
              <div>
                <dt>{settingText(summary.settings, "subtotal_label")}</dt>
                <dd>{cart.subtotal}</dd>
              </div>
            </dl>
          </aside>
        ) : null}
      </div>
    </>
  );
}
