import type { ReactElement } from "react";

import { useTranslation } from "react-i18next";

import { sampleShopContext } from "../../lib/shop-sample.js";

import { MarkdownProse } from "@rewindom/builtin/marketing/client/components/MarkdownProse.js";
import { type SectionViewProps } from "@rewindom/builtin/marketing/client/components/sections/section-parts.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";

export function ProductSection({ section }: SectionViewProps): ReactElement {
  const { t } = useTranslation(["shop"]);
  const product = sampleShopContext().product!;
  const buy = section.blocks.find((block) => block.type === "buy");
  const rest = section.blocks.filter((block) => block.type !== "buy");

  return (
    <div className="shop-product">
      <div className="shop-product-main">
        {rest.map((block) => {
          if (block.type === "media") {
            return (
              <div key={block.id} className="shop-gallery">
                <div className="shop-gallery-stage">
                  {product.images[0] ? (
                    <img src={product.images[0].url} alt={product.images[0].alt} />
                  ) : null}
                </div>
              </div>
            );
          }
          if (block.type === "title") {
            return (
              <div key={block.id}>
                <h1>{t("editor.sampleTitle")}</h1>
                <p className="shop-product-subtitle">{t("editor.sampleSubtitle")}</p>
              </div>
            );
          }
          if (block.type === "price") {
            return (
              <span key={block.id} className="shop-price">
                {t("editor.samplePrice")}
              </span>
            );
          }
          if (block.type === "description") {
            return (
              <div key={block.id} className="shop-product-description">
                <MarkdownProse markdown={t("editor.sampleDescription")} />
              </div>
            );
          }
          return null;
        })}
      </div>
      {buy ? (
        <div className="shop-product-buy">
          <form className="shop-buy">
            {product.variants.length > 1 ? (
              <fieldset className="shop-field">
                <legend>{settingText(buy.settings, "variant_label")}</legend>
                <div className="shop-variants">
                  {product.variants.map((variant, index) => (
                    <label
                      key={variant.id}
                      className={`shop-variant${variant.sold_out ? " is-sold-out" : ""}`}
                    >
                      <input
                        type="radio"
                        name="preview-variant"
                        defaultChecked={index === 0}
                        tabIndex={-1}
                        disabled
                      />
                      <span className="shop-variant-name">{t("editor.sampleVariant")}</span>
                      <span className="shop-variant-price">{t("editor.samplePrice")}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <div className="shop-buy-actions">
              <div className="shop-field">
                <label htmlFor="preview-qty">
                  {settingText(buy.settings, "quantity_label")}
                </label>
                <input
                  id="preview-qty"
                  type="number"
                  defaultValue={1}
                  min={1}
                  tabIndex={-1}
                  readOnly
                />
              </div>
              <button className="btn shop-cta" type="button" tabIndex={-1}>
                {settingText(buy.settings, "add_label")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
