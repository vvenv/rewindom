import type { ReactElement } from "react";

import { useTranslation } from "react-i18next";

import { useProducts } from "../../hooks/useShop.js";

import {
  gridClass,
  SectionHeading,
  type SectionViewProps,
} from "../../../../../packages/builtin/marketing/client/components/sections/section-parts.js";
import {
  settingBool,
  settingNumber,
  settingText,
} from "../../../../../packages/builtin/marketing/shared/section-schema.js";

export function ProductGridSection({
  section,
}: SectionViewProps): ReactElement | null {
  const { t } = useTranslation(["shop"]);
  const productsQuery = useProducts(1, 24);
  const s = section.settings;
  const published = (productsQuery.data?.items ?? []).filter(
    (item) => item.status === "published",
  );
  const limit = settingNumber(s, "limit", 0);
  const items = limit > 0 ? published.slice(0, limit) : published;
  const showPrice = settingBool(s, "show_price");

  if (items.length === 0) {
    if (productsQuery.isLoading) return null;
    return (
      <>
        <SectionHeading settings={s} />
        <p className="shop-muted">
          {t("section.productGrid.unconfigured")}{" "}
          <a href="/app/shop">{t("section.productGrid.unconfiguredCta")}</a>
        </p>
      </>
    );
  }

  if (settingText(s, "style") === "list") {
    return (
      <>
        <SectionHeading settings={s} />
        <div className="shop-grid-list">
          {items.map((product) => (
            <a key={product.id} href={`/shop/${product.slug}`}>
              <span>{product.title}</span>
              {showPrice && product.min_price_cents != null ? (
                <span className="shop-price">
                  {(product.min_price_cents / 100).toFixed(2)}
                </span>
              ) : null}
            </a>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <SectionHeading settings={s} />
      <div className={gridClass(settingNumber(s, "columns", 3))}>
        {items.map((product) => (
          <a key={product.id} className="card" href={`/shop/${product.slug}`}>
            {product.image_url ? (
              <img className="shop-card-image" src={product.image_url} alt="" />
            ) : null}
            <span className="title">{product.title}</span>
            {showPrice && product.min_price_cents != null ? (
              <span className="muted shop-price">
                {(product.min_price_cents / 100).toFixed(2)}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </>
  );
}
