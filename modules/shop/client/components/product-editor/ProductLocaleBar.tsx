import type { ReactElement } from "react";

import {
  APP_LOCALES,
  FieldInfoTip,
  getLocaleNativeLabel,
  type AppLocale,
} from "@rewindom/module-sdk/client";
import { Tabs, TabsList, TabsTrigger } from "@rewindom/ui/tabs";
import { useTranslation } from "react-i18next";

/**
 * 数据多语言切换：改的是商品内容用哪一种语言填写，不是工作台 UI 语言。
 */
export function ProductLocaleBar({
  value,
  onChange,
}: {
  value: AppLocale;
  onChange: (locale: AppLocale) => void;
}): ReactElement {
  const { t } = useTranslation("shop");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-muted-foreground flex items-center gap-1 text-sm">
        {t("contentLocale")}
        <FieldInfoTip text={t("infoContentLocale")} side="left" />
      </span>
      <Tabs
        value={value}
        onValueChange={(next) => onChange(next as AppLocale)}
      >
        <TabsList>
          {APP_LOCALES.map((locale) => (
            <TabsTrigger key={locale.slug} value={locale.slug}>
              {getLocaleNativeLabel(locale.slug)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
