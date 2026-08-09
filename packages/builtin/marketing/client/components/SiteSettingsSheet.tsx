import { type FormEvent, type ReactNode, useState } from "react";

import {
  getLocaleNativeLabel,
  normalizeLocale,
  type AppLocale,
} from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { ButtonGroup } from "@be-water/ui/button-group";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Spinner } from "@be-water/ui/spinner";
import { Switch } from "@be-water/ui/switch";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  readLocalizedSetting,
  writeLocalizedSetting,
} from "../../shared/section-schema.js";
import { siteLocaleOrder } from "../../shared/site-locale.js";
import { useSiteMutations } from "../hooks/useSite.js";

import type {
  MarketingSite,
  SiteLocalizedText,
} from "../../shared/site-cms.js";

interface SiteSettingsSheetProps {
  site: MarketingSite;
  children: ReactNode;
}

/**
 * 站点级设置：站名、标语与发布开关。
 *
 * 导航 / 页脚链接已改为 Theme Editor 里的**页头 / 页脚 section**（schema 驱动），
 * 品牌（Logo / 主色 / 字体）在「系统管理 → 品牌」。这里只留不属于版式的字段。
 *
 * 分三组：**站点信息**（多语言文案）、**语言**（主语言）、**可见性**（发布开关）。
 *
 * 站名 / 标语与页头文案同口径：逐字段 `__i18n`。译文切换按钮组挂在「站点信息」组的
 * 标题行里——它只作用于这一组的输入框，和下面独立成组的「主语言」不是一回事：前者是
 * 「正在填哪种译文」，后者是站点 URL 的默认语言。早先两者平铺成相邻的两项，几乎每个
 * 人都会看错，所以宁可多一层分组也要把作用域画出来。
 */
export function SiteSettingsSheet({ site, children }: SiteSettingsSheetProps) {
  const { t } = useTranslation("marketing");
  const { updateSite } = useSiteMutations();
  const [open, setOpen] = useState(false);
  const [siteName, setSiteName] = useState<SiteLocalizedText>(site.site_name);
  const [tagline, setTagline] = useState<SiteLocalizedText>(site.tagline);
  const [editLocale, setEditLocale] = useState<AppLocale>(
    normalizeLocale(site.default_locale),
  );
  const [published, setPublished] = useState(site.published);
  const [defaultLocale, setDefaultLocale] = useState<AppLocale>(
    normalizeLocale(site.default_locale),
  );

  const locales = siteLocaleOrder(defaultLocale);

  const reset = (): void => {
    const nextDefault = normalizeLocale(site.default_locale);
    setSiteName(site.site_name);
    setTagline(site.tagline);
    setEditLocale(nextDefault);
    setPublished(site.published);
    setDefaultLocale(nextDefault);
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    updateSite.mutate(
      {
        site_name: siteName,
        tagline,
        published,
        default_locale: defaultLocale,
      },
      {
        onSuccess: () => {
          toast.success(t("cms.toastSiteSaved"));
          setOpen(false);
        },
        onError: () => toast.error(t("cms.toastSiteSaveFailed")),
      },
    );
  };

  const nameValue = readLocalizedSetting(siteName, editLocale, defaultLocale);
  const nameFallback =
    editLocale !== defaultLocale
      ? readLocalizedSetting(siteName, defaultLocale, defaultLocale)
      : "";
  const taglineValue = readLocalizedSetting(tagline, editLocale, defaultLocale);
  const taglineFallback =
    editLocale !== defaultLocale
      ? readLocalizedSetting(tagline, defaultLocale, defaultLocale)
      : "";

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <form className="flex h-full flex-col" onSubmit={onSubmit}>
          <SheetHeader>
            <SheetTitle>{t("cms.settingsTitle")}</SheetTitle>
            <SheetDescription>{t("cms.settingsDescription")}</SheetDescription>
          </SheetHeader>

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <FieldSet>
              {/*
                标题行右侧就是译文切换（与 Theme Editor 同款），紧挨着它作用的两个
                输入框；单语言站点不渲染，标题下的说明也跟着换一句。

                说明单独占一行、不和按钮组挤在同一个 flex 行里：说明有二三十个字，
                塞进同一行会把按钮组挤到下一行去，"标题行右侧"就白设计了。
              */}
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FieldLegend variant="label" className="mb-0">
                    {t("cms.settingsSectionBasics")}
                  </FieldLegend>
                  {locales.length > 1 ? (
                    <ButtonGroup aria-label={t("cms.fieldEditLocale")}>
                      {locales.map((slug) => {
                        const active = slug === editLocale;
                        return (
                          <Button
                            key={slug}
                            type="button"
                            size="sm"
                            variant={active ? "secondary" : "outline"}
                            aria-pressed={active}
                            onClick={() => setEditLocale(slug)}
                          >
                            {getLocaleNativeLabel(slug)}
                          </Button>
                        );
                      })}
                    </ButtonGroup>
                  ) : null}
                </div>
                <FieldDescription>
                  {locales.length > 1
                    ? t("cms.settingsSectionBasicsLocaleHint")
                    : t("cms.settingsSectionBasicsHint")}
                </FieldDescription>
              </div>
              <Field>
                <FieldLabel htmlFor="site_name">
                  {t("cms.fieldSiteName")}
                </FieldLabel>
                <Input
                  id="site_name"
                  value={nameValue}
                  placeholder={nameFallback || undefined}
                  onChange={(e) =>
                    setSiteName(
                      writeLocalizedSetting(
                        siteName,
                        editLocale,
                        defaultLocale,
                        e.target.value,
                      ) as SiteLocalizedText,
                    )
                  }
                  required={editLocale === defaultLocale}
                />
                {editLocale !== defaultLocale ? (
                  <FieldDescription>
                    {nameFallback
                      ? t("cms.fieldLocalizedFallbackHint", {
                          fallback: nameFallback,
                        })
                      : t("cms.fieldLocalizedEmptyHint")}
                  </FieldDescription>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="tagline">
                  {t("cms.fieldTagline")}
                </FieldLabel>
                <Input
                  id="tagline"
                  value={taglineValue}
                  placeholder={taglineFallback || undefined}
                  onChange={(e) =>
                    setTagline(
                      writeLocalizedSetting(
                        tagline,
                        editLocale,
                        defaultLocale,
                        e.target.value,
                      ) as SiteLocalizedText,
                    )
                  }
                />
                {editLocale !== defaultLocale ? (
                  <FieldDescription>
                    {taglineFallback
                      ? t("cms.fieldLocalizedFallbackHint", {
                          fallback: taglineFallback,
                        })
                      : t("cms.fieldLocalizedEmptyHint")}
                  </FieldDescription>
                ) : null}
              </Field>
            </FieldSet>

            <FieldSet>
              <FieldLegend variant="label" className="mb-0">
                {t("cms.settingsSectionLocale")}
              </FieldLegend>
              {/*
                主语言 = URL 上**不带前缀**的那一种，改它会改掉全站已收录的链接结构。
              */}
              <Field>
                <FieldLabel htmlFor="default_locale">
                  {t("cms.fieldDefaultLocale")}
                </FieldLabel>
                <Select
                  value={defaultLocale}
                  onValueChange={(value) => {
                    const next = value as AppLocale;
                    setDefaultLocale(next);
                    setEditLocale(next);
                  }}
                >
                  <SelectTrigger id="default_locale">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locales.map((slug) => (
                      <SelectItem key={slug} value={slug}>
                        {getLocaleNativeLabel(slug)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {t("cms.fieldDefaultLocaleHint")}
                </FieldDescription>
              </Field>
            </FieldSet>

            <FieldSet>
              <FieldLegend variant="label" className="mb-0">
                {t("cms.settingsSectionVisibility")}
              </FieldLegend>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="published">
                    {t("cms.fieldPublished")}
                  </FieldLabel>
                  <FieldDescription>
                    {t("cms.fieldPublishedHint")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="published"
                  checked={published}
                  onCheckedChange={setPublished}
                />
              </Field>
            </FieldSet>

            {/* 「东西都搬哪去了」的路标，别混在可编辑项里当成又一条字段说明。 */}
            <div className="rounded-lg border border-dashed bg-muted/30 p-3">
              <FieldDescription>{t("cms.chromeMovedHint")}</FieldDescription>
            </div>
          </FieldGroup>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("common:cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={updateSite.isPending}>
              {updateSite.isPending ? <Spinner className="size-4" /> : null}
              {t("cms.save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
