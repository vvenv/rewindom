import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import {
  getLocaleNativeLabel,
  normalizeLocale,
  type AppLocale,
} from "@rewindom/shared";
import { Button } from "@rewindom/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  isTemplatePageKind,
  relocalizeStockTemplateDescription,
  resolveCatalogPageTitle,
} from "../../shared/page-templates.js";
import {
  type MarketingPage,
  type MarketingPageKind,
  type MarketingPageListItem,
} from "../../shared/site-cms.js";
import { siteLocaleOrder } from "../../shared/site-locale.js";
import { useSite, useSiteMutations, useSitePages } from "../hooks/useSite.js";


/**
 * 复制的源页面：列表项与详情都能满足。
 *
 * `description` 也要在列里——面板要拿它判「源页没有描述，复制出来的那张存不下去」
 * （见下面的 `missingDescription`）。漏掉它时这个文件是编译不过的。
 */
type DuplicateSource = Pick<
  MarketingPageListItem,
  "id" | "title" | "description" | "slug" | "kind" | "locale"
>;

interface SitePageDuplicateSheetProps {
  page: DuplicateSource;
  /**
   * 触发器。放在下拉菜单里时给不出来——菜单项一点菜单就关，`SheetTrigger`
   * 跟着卸载，这时改用受控的 `open` / `onOpenChange`。
   */
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  open: controlledOpen,
  onOpenChange,
  onDuplicated,
}: SitePageDuplicateSheetProps) {
  const { t } = useTranslation("marketing");
  const { duplicatePage } = useSiteMutations();
  const siteQuery = useSite();
  const pagesQuery = useSitePages();
  const defaultLocale = normalizeLocale(siteQuery.data?.default_locale);
  const existing = translatedLocales(pagesQuery.data, page);
  /** 首页 / 文档模板页 slug 固定，同语言不能再复制一份。 */
  const fixedSlug =
    page.kind === "home" || isTemplatePageKind(page.kind);
  /** 默认选**还没建**的那门语言——复制的常见用途就是补译文。 */
  const suggestedLocale =
    siteLocaleOrder(defaultLocale).find((slug) => !existing.has(slug)) ??
    page.locale;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean): void => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  // 模板页的标题常常还空着：预填展示用的预设文案，别再复制出一张没标题的页
  const displayTitle = resolveCatalogPageTitle(
    page.kind,
    page.locale,
    page.title,
  );
  const [title, setTitle] = useState(displayTitle);
  const [locale, setLocale] = useState<AppLocale>(suggestedLocale);
  const localeTaken = existing.has(locale);
  /*
   * 描述是必填的，而复制不让填描述——它照搬源页（库存文案换目标语言）。
   * 源页自己就没有描述时复制出来的那张页保存不了，所以在这儿先拦住，
   * 判定与服务端 `duplicatePage` 用的是同一个函数。
   */
  const missingDescription = !relocalizeStockTemplateDescription(
    page.kind,
    page.description,
    locale,
  ).trim();
  const blocked = (fixedSlug && localeTaken) || missingDescription;

  // 页面清单是异步来的，建议语言可能在打开面板后才算得出来
  useEffect(() => {
    if (!open) {
      setTitle(displayTitle);
      setLocale(suggestedLocale);
    }
  }, [open, displayTitle, suggestedLocale]);

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (blocked) return;
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
      {children ? <SheetTrigger asChild>{children}</SheetTrigger> : null}
      <SheetContent className="sm:max-w-md">
        <form className="flex h-full flex-col" onSubmit={onSubmit}>
          <SheetHeader>
            <SheetTitle>{t("cms.duplicatePageTitle")}</SheetTitle>
            <SheetDescription>
              {t("cms.duplicatePageDescription", {
                title: displayTitle,
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
                    <SelectItem
                      key={slug}
                      value={slug}
                      disabled={fixedSlug && existing.has(slug)}
                    >
                      {getLocaleNativeLabel(slug)}
                      {existing.has(slug) ? ` · ${t("cms.localeTaken")}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {missingDescription
                  ? t("cms.duplicateNeedsDescriptionHint")
                  : fixedSlug && localeTaken
                    ? t("cms.duplicateFixedSlugTakenHint")
                    : localeTaken
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
            <Button
              type="submit"
              disabled={duplicatePage.isPending || blocked}
            >
              {duplicatePage.isPending ? <Spinner className="size-4" /> : null}
              {t("cms.duplicate")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
