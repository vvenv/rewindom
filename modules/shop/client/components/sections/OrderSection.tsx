import type { ReactElement } from "react";

import { useTranslation } from "react-i18next";

import { sampleShopContext } from "../../lib/shop-sample.js";

import {
  SectionHeading,
  type SectionViewProps,
} from "@rewindom/builtin/marketing/client/components/sections/section-parts.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";

export function OrderSection({ section }: SectionViewProps): ReactElement {
  const { t } = useTranslation(["shop"]);
  const order = sampleShopContext().order!;
  const s = section.settings;
  return (
    <>
      <SectionHeading settings={s} />
      <div className="shop-order">
        <header className="shop-order-head">
          <div>
            <p className="shop-order-kicker">{settingText(s, "status_label")}</p>
            <h1>{order.number}</h1>
          </div>
          <span className="shop-status">{t("editor.sampleStatus")}</span>
        </header>
        <div className="shop-order-body">
          <ul className="shop-lines">
            {order.lines.map((line) => (
              <li key={line.title} className="shop-line shop-line-plain">
                <span className="shop-line-title">{line.title}</span>
                <span className="shop-muted">× {line.quantity}</span>
                <span className="shop-line-total">{line.line_total}</span>
              </li>
            ))}
          </ul>
          <aside className="shop-checkout-aside">
            <dl className="shop-totals">
              <div>
                <dt>{settingText(s, "shipping_label")}</dt>
                <dd>{order.shipping}</dd>
              </div>
              <div>
                <dt>{settingText(s, "tax_label")}</dt>
                <dd>{order.tax}</dd>
              </div>
              <div className="is-grand">
                <dt>{settingText(s, "total_label")}</dt>
                <dd>{order.total}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </>
  );
}

export function OrderListSection({ section }: SectionViewProps): ReactElement {
  const orders = sampleShopContext().orders;
  const s = section.settings;
  return (
    <>
      <SectionHeading settings={s} />
      <table className="shop-table">
        <thead>
          <tr>
            <th>{settingText(s, "number_label")}</th>
            <th>{settingText(s, "status_label")}</th>
            <th>{settingText(s, "total_label")}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.number}>
              <td>
                <a href={order.href} tabIndex={-1}>
                  {order.number}
                </a>
              </td>
              <td>
                <span className="shop-status">{order.status}</span>
              </td>
              <td>{order.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
