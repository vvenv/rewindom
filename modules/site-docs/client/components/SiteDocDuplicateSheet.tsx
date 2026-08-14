import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import {
  getLocaleNativeLabel,
  normalizeLocale,
  type AppLocale,
} from "@rewindom/module-sdk/client";
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
import { toast } from "@rewindom/ui/toast";

import { siteLocaleOrder } from "../../../../packages/builtin/marketing/shared/site-locale.js";
import { useSite } from "../../../../packages/builtin/marketing/client/hooks/useSite.js";
import {
  useDuplicateSiteDoc,
  useSiteDocsCatalog,
} from "../hooks/useSiteDocs.js";

import type {
  SiteDoc,
  SiteDocListItem,
} from "../../shared/site-doc.js";

/** 复制的源文档：列表项即可。 */
type DuplicateSource = Pick<
  SiteDocListItem,
  "id" | "title" | "slug" | "locale"
>;

interface SiteDocDuplicateSheetProps {
  doc: DuplicateSource;
  /**
   * 触发器。放在下拉菜单里时给不出来——菜单项一点菜单就关，`SheetTrigger`
   * 跟着卸载，这时改用受控的 `open` / `onOpenChange`。
   */
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 复制成功后的去向（例如打开新译文的编辑器）。 */
  onDuplicated?: (doc: SiteDoc) => void;
}

/** 同一路径已经建了哪些语言（翻译组 = 同 `slug`）。 */
function translatedLocales(
  docs: SiteDocListItem[] | undefined,
  slug: string,
): Set<string> {
  return new Set(
    (docs ?? []).filter((item) => item.slug === slug).map((item) => item.locale),
  );
}

/**
 * 复制文档：输入标题 + 选目标语言，用来快速从一种语言铺出另一种语言。
 *
 * slug 不给填——`slug` 是翻译组的 key，复制到别的语言必须沿用源 slug 才能自动成组；
 * 目标语言已被占用时禁用提交。
 */
export function SiteDocDuplicateSheet({
  doc,
  children,
  open: controlledOpen,
  onOpenChange,
  onDuplicated,
}: SiteDocDuplicateSheetProps) {
  const { t } = useTranslation("site-docs");
  const duplicateDoc = useDuplicateSiteDoc();
  const siteQuery = useSite();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean): void => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const docsQuery = useSiteDocsCatalog(open);
  const defaultLocale = normalizeLocale(siteQuery.data?.default_locale);
  const existing = translatedLocales(docsQuery.data?.items, doc.slug);
  /** 默认选**还没建**的那门语言——复制的常见用途就是补译文。 */
  const suggestedLocale =
    siteLocaleOrder(defaultLocale).find((slug) => !existing.has(slug)) ??
    doc.locale;
  const [title, setTitle] = useState(doc.title);
  const [locale, setLocale] = useState<AppLocale>(suggestedLocale);
  const localeTaken = existing.has(locale);

  useEffect(() => {
    if (!open) {
      setTitle(doc.title);
      setLocale(suggestedLocale);
    }
  }, [open, doc.title, suggestedLocale]);

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (localeTaken) return;
    duplicateDoc.mutate(
      { docId: doc.id, body: { title: title.trim(), locale } },
      {
        onSuccess: (created) => {
          toast.success(t("siteDocs.toastDocDuplicated"));
          setOpen(false);
          onDuplicated?.(created);
        },
        onError: () => toast.error(t("siteDocs.toastDocDuplicateFailed")),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children ? <SheetTrigger asChild>{children}</SheetTrigger> : null}
      <SheetContent className="sm:max-w-md">
        <form className="flex h-full flex-col" onSubmit={onSubmit}>
          <SheetHeader>
            <SheetTitle>{t("siteDocs.duplicateDocTitle")}</SheetTitle>
            <SheetDescription>
              {t("siteDocs.duplicateDocDescription", {
                title: doc.title,
                locale: getLocaleNativeLabel(doc.locale),
              })}
            </SheetDescription>
          </SheetHeader>

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor="duplicate_doc_title">
                {t("siteDocs.title")}
              </FieldLabel>
              <Input
                id="duplicate_doc_title"
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
                      disabled={existing.has(slug)}
                    >
                      {getLocaleNativeLabel(slug)}
                      {existing.has(slug)
                        ? ` · ${t("siteDocs.localeTaken")}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {localeTaken
                  ? t("siteDocs.duplicateLocaleTakenHint")
                  : t("siteDocs.duplicateLocaleHint")}
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
              disabled={duplicateDoc.isPending || localeTaken}
            >
              {duplicateDoc.isPending ? <Spinner className="size-4" /> : null}
              {t("siteDocs.duplicate")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
