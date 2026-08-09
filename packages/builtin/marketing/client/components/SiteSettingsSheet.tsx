import { type FormEvent, type ReactNode, useId, useState } from "react";

import { useConfirm } from "@be-water/client-kit";
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
  FieldSet,
  FieldTitle,
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
 * 同一段文案的两种存储形态（纯字符串 / `__i18n`）表达的可能是同一份内容，
 * 逐语言读出来比就不会把「形状变了但字没变」误判成改动。
 */
function sameLocalizedText(
  a: SiteLocalizedText,
  b: SiteLocalizedText,
  locales: AppLocale[],
  defaultLocale: AppLocale,
): boolean {
  return locales.every(
    (locale) =>
      readLocalizedSetting(a, locale, defaultLocale) ===
      readLocalizedSetting(b, locale, defaultLocale),
  );
}

/**
 * 站点级设置：站名、标语与发布开关。
 *
 * 导航 / 页脚链接已改为 Theme Editor 里的**页头 / 页脚 section**（schema 驱动），
 * 品牌（Logo / 主色 / 字体）在「系统管理 → 品牌」。这里只留不属于版式的字段。
 *
 * 分三组：**站点信息**（多语言文案）、**语言**（主语言）、**可见性**（发布开关）。
 * 分组标题用 `FieldTitle` + `aria-labelledby` 而不是 `legend`——`legend` 必须是
 * `fieldset` 的首个子元素，而「站点信息」的标题行右侧还要放译文切换。
 *
 * 站名 / 标语与页头文案同口径：逐字段 `__i18n`。译文切换按钮组挂在「站点信息」组的
 * 标题行里——它只作用于这一组的输入框，和下面独立成组的「主语言」不是一回事：前者是
 * 「正在填哪种译文」，后者是站点 URL 的默认语言。早先两者平铺成相邻的两项，几乎每个
 * 人都会看错，所以宁可多一层分组也要把作用域画出来。
 */
export function SiteSettingsSheet({ site, children }: SiteSettingsSheetProps) {
  const { t } = useTranslation("marketing");
  const { updateSite } = useSiteMutations();
  const { confirm } = useConfirm();
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

  const groupId = useId();
  const basicsTitleId = `${groupId}-basics`;
  const localeTitleId = `${groupId}-locale`;
  const visibilityTitleId = `${groupId}-visibility`;
  const editLocaleLabelId = `${groupId}-edit-locale`;

  const savedLocale = normalizeLocale(site.default_locale);
  const locales = siteLocaleOrder(defaultLocale);
  const localeChanged = defaultLocale !== savedLocale;

  /** 主语言的站名是所有语言的兜底，空了整站没名字——它不随「正在编辑哪种译文」变。 */
  const primaryName = readLocalizedSetting(
    siteName,
    defaultLocale,
    defaultLocale,
  ).trim();

  /*
   * 脏检查按**保存时的主语言**读两边：主语言本身改没改，已经由 localeChanged 兜住了。
   */
  const isDirty =
    localeChanged ||
    published !== site.published ||
    !sameLocalizedText(
      siteName,
      site.site_name,
      siteLocaleOrder(savedLocale),
      savedLocale,
    ) ||
    !sameLocalizedText(
      tagline,
      site.tagline,
      siteLocaleOrder(savedLocale),
      savedLocale,
    );

  const reset = (): void => {
    setSiteName(site.site_name);
    setTagline(site.tagline);
    setEditLocale(savedLocale);
    setPublished(site.published);
    setDefaultLocale(savedLocale);
  };

  /** 关闭前拦一道：Esc、点遮罩、点取消都会走到这里。 */
  const handleOpenChange = (next: boolean): void => {
    if (next) {
      reset();
      setOpen(true);
      return;
    }
    if (!isDirty) {
      setOpen(false);
      return;
    }
    void confirm({
      title: t("cms.discardConfirmTitle"),
      description: t("cms.discardConfirmDescription"),
      confirmText: t("cms.discardConfirm"),
      destructive: true,
    }).then((confirmed) => {
      if (confirmed) setOpen(false);
    });
  };

  const save = (): void => {
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

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    /*
     * 输入框上的 `required` 只在正在编辑主语言时生效——否则填着副语言译文就能提交，
     * 把主语言站名存成空。这里按主语言的值再判一次，并把编辑语言切回去让人看见。
     */
    if (!primaryName) {
      setEditLocale(defaultLocale);
      toast.error(
        t("cms.toastSiteNameRequired", {
          locale: getLocaleNativeLabel(defaultLocale),
        }),
      );
      return;
    }
    if (!localeChanged) {
      save();
      return;
    }
    void confirm({
      title: t("cms.defaultLocaleConfirmTitle"),
      description: t("cms.defaultLocaleConfirmDescription", {
        from: getLocaleNativeLabel(savedLocale),
        to: getLocaleNativeLabel(defaultLocale),
        fromSlug: savedLocale,
      }),
      confirmText: t("cms.defaultLocaleConfirm"),
      destructive: true,
    }).then((confirmed) => {
      if (confirmed) save();
    });
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
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <form className="flex h-full flex-col" onSubmit={onSubmit}>
          <SheetHeader>
            <SheetTitle>{t("cms.settingsTitle")}</SheetTitle>
            <SheetDescription>{t("cms.settingsDescription")}</SheetDescription>
          </SheetHeader>

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <FieldSet aria-labelledby={basicsTitleId}>
              {/*
                标题行右侧就是译文切换（与 Theme Editor 同款），紧挨着它作用的两个
                输入框。

                说明单独占一行、不和按钮组挤在同一个 flex 行里：说明有二三十个字，
                塞进同一行会把按钮组挤到下一行去，「标题行右侧」就白设计了。
              */}
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <FieldTitle
                    id={basicsTitleId}
                    className="text-base font-semibold"
                  >
                    {t("cms.settingsSectionBasics")}
                  </FieldTitle>
                  {locales.length > 1 ? (
                    <div className="flex items-center gap-2">
                      <span
                        id={editLocaleLabelId}
                        className="text-xs text-muted-foreground"
                      >
                        {t("cms.fieldEditLocale")}
                      </span>
                      <ButtonGroup aria-labelledby={editLocaleLabelId}>
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
                    </div>
                  ) : null}
                </div>
                <FieldDescription>
                  {t("cms.settingsSectionBasicsHint")}
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

            <FieldSet aria-labelledby={localeTitleId}>
              <FieldTitle
                id={localeTitleId}
                className="text-base font-semibold"
              >
                {t("cms.settingsSectionLocale")}
              </FieldTitle>
              {/*
                主语言 = URL 上**不带前缀**的那一种，改它会改掉全站已收录的链接结构。
                所以改动当场标红，保存时还要再确认一次——它不该和改标语一样顺手。
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
                {localeChanged ? (
                  <FieldDescription className="font-medium text-destructive">
                    {t("cms.fieldDefaultLocaleWarning", {
                      from: getLocaleNativeLabel(savedLocale),
                      to: getLocaleNativeLabel(defaultLocale),
                    })}
                  </FieldDescription>
                ) : null}
              </Field>
            </FieldSet>

            <FieldSet aria-labelledby={visibilityTitleId}>
              <FieldTitle
                id={visibilityTitleId}
                className="text-base font-semibold"
              >
                {t("cms.settingsSectionVisibility")}
              </FieldTitle>
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
