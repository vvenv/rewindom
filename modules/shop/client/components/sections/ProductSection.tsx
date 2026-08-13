import type { ReactElement } from "react";

import { useTranslation } from "react-i18next";

import { sampleShopContext } from "../../lib/shop-sample.js";

import { type SectionViewProps } from "../../../../../packages/builtin/marketing/client/components/sections/section-parts.js";
import { settingText } from "../../../../../packages/builtin/marketing/shared/section-schema.js";

export function ProductSection({ section }: SectionViewProps): ReactElement {
  const { t } = useTranslation(["shop"]);
  const product = sampleShopContext().product!;
  const buy = section.blocks.find((block) => block.type === "buy");
  const rest = section.blocks.filter((block) => block.type !== "buy");

  return (
    <div className="shop-product">
      <div className="shop-product-main">
        {rest.map((block) => {
          if (block.type === "title") return <h1 key={block.id}>{t("editor.sampleTitle")}</h1>;
          if (block.type === "price") {
            return (
              <p key={block.id} className="shop-price">
                {t("editor.samplePrice")}
              </p>
            );
          }
          if (block.type === "description") {
            return <p key={block.id}>{t("editor.sampleDescription")}</p>;
          }
          return null;
        })}
      </div>
      {buy ? (
        <div className="shop-product-buy">
          <form className="shop-buy">
            <div className="shop-field">
              <label htmlFor="preview-variant">
                {settingText(buy.settings, "variant_label")}
              </label>
              <select id="preview-variant" tabIndex={-1} disabled>
                {product.variants.map((variant) => (
                  <option key={variant.id}>
                    {t("editor.sampleVariant")} — {t("editor.samplePrice")}
                  </option>
                ))}
              </select>
            </div>
            <div className="shop-field">
              <label htmlFor="preview-qty">
                {settingText(buy.settings, "quantity_label")}
              </label>
              <input id="preview-qty" type="number" defaultValue={1} tabIndex={-1} readOnly />
            </div>
            <button className="btn" type="button" tabIndex={-1}>
              {settingText(buy.settings, "add_label")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
