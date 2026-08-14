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
                <div key={block.id}>
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
                <div key={block.id}>
                  {settingText(s, "heading") ? (
                    <h3 className="shop-block-head">{settingText(s, "heading")}</h3>
                  ) : null}
                  <Field id="preview-name" label={settingText(s, "name_label")} />
                  <Field id="preview-line1" label={settingText(s, "line1_label")} />
                  <Field id="preview-city" label={settingText(s, "city_label")} />
                  <Field id="preview-state" label={settingText(s, "state_label")} />
                  <Field id="preview-postal" label={settingText(s, "postal_label")} />
                  <Field id="preview-country" label={settingText(s, "country_label")} />
                  <Field id="preview-phone" label={settingText(s, "phone_label")} type="tel" />
                </div>
              );
            }
            if (block.type === "shipping") {
              return (
                <div key={block.id}>
                  {settingText(block.settings, "heading") ? (
                    <h3 className="shop-block-head">
                      {settingText(block.settings, "heading")}
                    </h3>
                  ) : null}
                  <div className="shop-field">
                    <select tabIndex={-1} disabled>
                      {checkout.rates.map((rate) => (
                        <option key={rate.id}>
                          {rate.label} — {rate.price}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            }
            if (block.type === "note") {
              return (
                <div key={block.id}>
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
                <p key={block.id}>
                  <button className="btn" type="button" tabIndex={-1}>
                    {settingText(block.settings, "submit_label")}
                  </button>
                </p>
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
            {cart.items.map((item) => (
              <p key={item.id}>
                {item.title} × {item.quantity}
                <span className="shop-muted"> {item.line_total}</span>
              </p>
            ))}
            <p className="shop-price">
              {settingText(summary.settings, "subtotal_label")}: {cart.subtotal}
            </p>
          </aside>
        ) : null}
      </div>
    </>
  );
}
