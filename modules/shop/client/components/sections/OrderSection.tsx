import type { ReactElement } from "react";

import { useTranslation } from "react-i18next";

import { sampleShopContext } from "../../lib/shop-sample.js";

import {
  SectionHeading,
  type SectionViewProps,
} from "../../../../../packages/builtin/marketing/client/components/sections/section-parts.js";
import { settingText } from "../../../../../packages/builtin/marketing/shared/section-schema.js";

export function OrderSection({ section }: SectionViewProps): ReactElement {
  const { t } = useTranslation(["shop"]);
  const order = sampleShopContext().order!;
  const s = section.settings;
  return (
    <>
      <SectionHeading settings={s} />
      <p>
        {settingText(s, "status_label")}: {t("editor.sampleStatus")}
      </p>
      <h1>{order.number}</h1>
      <table className="shop-table">
        <tbody>
          {order.lines.map((line) => (
            <tr key={line.title}>
              <td>{line.title}</td>
              <td>{line.quantity}</td>
              <td>{line.line_total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="shop-totals">
        <p>
          {settingText(s, "shipping_label")}: {order.shipping}
        </p>
        <p>
          {settingText(s, "tax_label")}: {order.tax}
        </p>
        <p className="shop-price">
          {settingText(s, "total_label")}: {order.total}
        </p>
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
              <td>{order.status}</td>
              <td>{order.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
