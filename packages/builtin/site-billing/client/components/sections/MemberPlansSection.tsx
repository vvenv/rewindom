/**
 * 「会员套餐」段的编辑器预览。
 *
 * 预览里**拿不到**按请求数据（哪几档在售、这位访客订的是哪档，那些只在 SSR 时才有），
 * 所以画的是一份**占位样张**：结构、class、层级与 `server/plans-section.ts` 一致，
 * 内容是三张示意卡。这比渲染成空白诚实——站长要看的是「这一段摆上去长什么样」。
 */

import type { ReactElement } from "react";

import { useTranslation } from "react-i18next";

import { SectionHeading, type SectionViewProps  } from "../../../../marketing/client/components/sections/section-parts.js";
import {
  settingBool,
  settingText,
} from "../../../../marketing/shared/section-schema.js";


/** 样张：三档常见价位，只为撑出版式。 */
const SAMPLE = [
  { key: "a", price: "¥29", unit: "/mo" },
  { key: "b", price: "¥199", unit: "/yr" },
  { key: "c", price: "¥599", unit: "" },
];

export function MemberPlansSection({
  section,
}: SectionViewProps): ReactElement {
  const { t } = useTranslation(["site-billing"]);
  const s = section.settings;
  const showDescription = settingBool(s, "show_description");

  return (
    <>
      <SectionHeading settings={s} />
      <div className="mplan-grid">
        {SAMPLE.map((sample, index) => (
          <div key={sample.key} className="mplan-card">
            <p className="mplan-name">{`${t("section.plans.label")} ${index + 1}`}</p>
            {showDescription ? (
              <p className="mplan-desc">{t("plans.description")}</p>
            ) : null}
            <p className="mplan-price">
              {sample.price}
              {sample.unit ? <span className="unit">{sample.unit}</span> : null}
            </p>
            <p>
              <span className="btn btn-primary">{settingText(s, "cta_label")}</span>
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
