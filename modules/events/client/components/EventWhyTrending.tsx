import { Badge } from "@rewindom/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@rewindom/ui/card";
import { useTranslation } from "react-i18next";

import type { EventTrendingFactor } from "../../shared/index.js";

/**
 * 「为什么在扩散」。
 *
 * **只有可核对的事实，没有解释、没有动机推断**（MVP §11：不给建议、不做预测、
 * 不判断谁对、不引入来源外的事实）。文案由 code + 参数拼成，不让模型写自由文本——
 * 一旦允许，就会出现「因为开发者社区普遍担忧」这种没有出处的句子。
 *
 * 每条都带 confirmed / discussion 标签：把讨论热度当成事情本身，
 * 正是这个产品要避免的，所以那个标签不能省。
 *
 * 说不清楚就整块不渲染——留白比编一句更权威。
 */
export function EventWhyTrending({ factors }: { factors: EventTrendingFactor[] }) {
  const { t } = useTranslation("events");
  if (factors.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("why.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-sm">
          {factors.map((factor) => (
            <li key={factor.code} className="flex flex-wrap items-baseline gap-2">
              <Badge
                variant={factor.confidence === "confirmed" ? "default" : "outline"}
                className="font-normal"
              >
                {t(`why.${factor.confidence}`)}
              </Badge>
              <span>{t(factor.code, factor.params)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
