import { type FormEvent, type ReactNode, useEffect, useState } from "react";

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
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { siteLocaleOrder } from "../../shared/site-locale.js";
import { useSite, useSiteMutations, useSitePages } from "../hooks/useSite.js";

import type {
  MarketingPage,
  MarketingPageKind,
  MarketingPageListItem,
} from "../../shared/site-cms.js";

/** 复制的源页面：列表项与详情都能满足。 */
type DuplicateSource = Pick<
  MarketingPageListItem,
  "id" | "title" | "slug" | "kind" | "locale"
>;

interface SitePageDuplicateSheetProps {
  page: DuplicateSource;
  children: ReactNode;
  /** 复制成功后的去向（编辑器里复制完直接跳到新页面）。 */
  onDuplicated?: (page: MarketingPage) => void;
}

/** 同一篇内容已经建了哪些语言（翻译组 = 同 `kind + slug`）。 */
function translatedLocales(
  pages: MarketingPageListItem[] | undefined,
  source: { kind: MarketingPageKind; slug: string },
): Set<string> {
  return new Set(
    (pages ?? [])
      .filter((item) => item.kind === source.kind && item.slug === source.slug)
      .map((item) => item.locale),
  );
}

/**
 * 复制页面：输入标题 + 选目标语言，用来快速从一种语言铺出另一种语言。
 *
 * slug 不给填——`(kind, slug)` 是翻译组的 key，复制到别的语言必须沿用源 slug 才能
 * 自动成组；复制到已被占用的语言时由服务端派生 `xxx-copy`。
 */
export function SitePageDuplicateSheet({
  page,
  children,
  onDuplicated,
}: SitePageDuplicateSheetProps) {
  const { t } = useTranslation("marketing");
  const { duplicatePage } = useSiteMutations();
  const siteQuery = useSite();
  const pagesQuery = useSitePages();
  const defaultLocale = normalizeLocale(siteQuery.data?.default_locale);
  const existing = translatedLocales(pagesQuery.data, page);
  /** 默认选**还没建**的那门语言——复制的常见用途就是补译文。 */
  const suggestedLocale =
    siteLocaleOrder(defaultLocale).find((slug) => !existing.has(slug)) ??
    page.locale;

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(page.title);
  const [locale, setLocale] = useState<AppLocale>(suggestedLocale);

  // 页面清单是异步来的，建议语言可能在打开面板后才算得出来
  useEffect(() => {
    if (!open) {
      setTitle(page.title);
      setLocale(suggestedLocale);
    }
  }, [open, page.title, suggestedLocale]);

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    duplicatePage.mutate(
      { pageId: page.id, body: { title: title.trim(), locale } },
      {
        onSuccess: (created) => {
          toast.success(t("cms.toastPageDuplicated"));
          setOpen(false);
          onDuplicated?.(created);
        },
        onError: () => toast.error(t("cms.toastPageDuplicateFailed")),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <form className="flex h-full flex-col" onSubmit={onSubmit}>
          <SheetHeader>
            <SheetTitle>{t("cms.duplicatePageTitle")}</SheetTitle>
            <SheetDescription>
              {t("cms.duplicatePageDescription", {
                title: page.title,
                locale: getLocaleNativeLabel(page.locale),
              })}
            </SheetDescription>
          </SheetHeader>

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor="duplicate_title">
                {t("cms.fieldTitle")}
              </FieldLabel>
              <Input
                id="duplicate_title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel>{t("cms.fieldLocale")}</FieldLabel>
              <Select
                value={locale}
                onValueChange={(value) => setLocale(value as AppLocale)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {siteLocaleOrder(defaultLocale).map((slug) => (
                    <SelectItem key={slug} value={slug}>
                      {getLocaleNativeLabel(slug)}
                      {existing.has(slug) ? ` · ${t("cms.localeTaken")}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {existing.has(locale)
                  ? t("cms.duplicateSlugSuffixHint")
                  : t("cms.duplicateLocaleHint")}
              </FieldDescription>
            </Field>
          </FieldGroup>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("common:cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={duplicatePage.isPending}>
              {duplicatePage.isPending ? <Spinner className="size-4" /> : null}
              {t("cms.duplicate")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
