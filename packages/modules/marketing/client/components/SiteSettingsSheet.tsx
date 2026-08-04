import { type FormEvent, type ReactNode, useState } from "react";

import {
  getLocaleNativeLabel,
  normalizeLocale,
  type AppLocale,
} from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
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

import type { MarketingSite, SiteLocalizedText } from "../../shared/site-cms.js";

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
 * 站名与页头文案同口径：逐字段 `__i18n`，编辑某一语言的槽位。
 */
export function SiteSettingsSheet({ site, children }: SiteSettingsSheetProps) {
  const { t } = useTranslation("marketing");
  const { updateSite } = useSiteMutations();
  const [open, setOpen] = useState(false);
  const [siteName, setSiteName] = useState<SiteLocalizedText>(site.site_name);
  const [nameLocale, setNameLocale] = useState<AppLocale>(
    normalizeLocale(site.default_locale),
  );
  const [tagline, setTagline] = useState(site.tagline);
  const [published, setPublished] = useState(site.published);
  const [defaultLocale, setDefaultLocale] = useState<AppLocale>(
    normalizeLocale(site.default_locale),
  );
  const [showLocaleSwitcher, setShowLocaleSwitcher] = useState(
    site.theme_settings.show_locale_switcher === true,
  );

  const reset = (): void => {
    const nextDefault = normalizeLocale(site.default_locale);
    setSiteName(site.site_name);
    setNameLocale(nextDefault);
    setTagline(site.tagline);
    setPublished(site.published);
    setDefaultLocale(nextDefault);
    setShowLocaleSwitcher(site.theme_settings.show_locale_switcher === true);
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    updateSite.mutate(
      {
        site_name: siteName,
        tagline,
        published,
        default_locale: defaultLocale,
        // 只传这一个字段：服务端把 theme_settings 合并进现有主题，不会覆盖其它设置
        theme_settings: { show_locale_switcher: showLocaleSwitcher },
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

  const nameValue = readLocalizedSetting(siteName, nameLocale, defaultLocale);
  const nameFallback =
    nameLocale !== defaultLocale
      ? readLocalizedSetting(siteName, defaultLocale, defaultLocale)
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

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="site_name">
                  {t("cms.fieldSiteName")}
                </FieldLabel>
                <Select
                  value={nameLocale}
                  onValueChange={(value) => setNameLocale(value as AppLocale)}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-auto min-w-28"
                    aria-label={t("cms.fieldSiteNameLocale")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {siteLocaleOrder(defaultLocale).map((slug) => (
                      <SelectItem key={slug} value={slug}>
                        {getLocaleNativeLabel(slug)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                id="site_name"
                value={nameValue}
                placeholder={nameFallback || undefined}
                onChange={(e) =>
                  setSiteName(
                    writeLocalizedSetting(
                      siteName,
                      nameLocale,
                      defaultLocale,
                      e.target.value,
                    ) as SiteLocalizedText,
                  )
                }
                required={nameLocale === defaultLocale}
              />
              <FieldDescription>
                {t("cms.fieldSiteNameHint")}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="tagline">{t("cms.fieldTagline")}</FieldLabel>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </Field>
            {/*
              主语言 = URL 上**不带前缀**的那一种，改它会改掉全站已收录的链接结构，
              所以放在站点设置里而不是各页面上。
            */}
            <Field>
              <FieldLabel>{t("cms.fieldDefaultLocale")}</FieldLabel>
              <Select
                value={defaultLocale}
                onValueChange={(value) => {
                  const next = value as AppLocale;
                  setDefaultLocale(next);
                  // 主语言改了之后，站名编辑槽位跟过去，避免仍停在旧主语言
                  setNameLocale(next);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {siteLocaleOrder(defaultLocale).map((slug) => (
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
            {/*
              语言切换器是**站点级**开关：它表态的是「这个站对外是不是多语言站」，
              与主语言同属语言配置，所以不放在页头 section 的设置里。
            */}
            <Field orientation="horizontal">
              <div className="flex flex-1 flex-col gap-1">
                <FieldLabel htmlFor="show_locale_switcher">
                  {t("cms.fieldLocaleSwitcher")}
                </FieldLabel>
                <FieldDescription>
                  {t("cms.fieldLocaleSwitcherHint")}
                </FieldDescription>
              </div>
              <Switch
                id="show_locale_switcher"
                checked={showLocaleSwitcher}
                onCheckedChange={setShowLocaleSwitcher}
              />
            </Field>
            <Field orientation="horizontal">
              <div className="flex flex-1 flex-col gap-1">
                <FieldLabel htmlFor="published">
                  {t("cms.fieldPublished")}
                </FieldLabel>
                <FieldDescription>
                  {t("cms.fieldPublishedHint")}
                </FieldDescription>
              </div>
              <Switch
                id="published"
                checked={published}
                onCheckedChange={setPublished}
              />
            </Field>
            <FieldDescription>{t("cms.chromeMovedHint")}</FieldDescription>
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
