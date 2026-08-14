import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { ApiError, useConfirm } from "@rewindom/module-sdk/client";
import {
  getLocaleNativeLabel,
  normalizeLocale,
  type AppLocale,
} from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Field, FieldDescription, FieldLabel } from "@rewindom/ui/field";
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
import { Skeleton } from "@rewindom/ui/skeleton";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { cn } from "@rewindom/ui/utils";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { X } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

import {
  categoryOptions,
} from "../../shared/site-doc-category.js";
import {
  docPath,
  type SiteDocListItem,
} from "../../shared/site-doc.js";
import { siteLocaleOrder } from "../../../../packages/builtin/marketing/shared/site-locale.js";
import { useSiteDocEditorForm } from "../hooks/use-site-doc-editor-form.js";
import { useSite } from "../../../../packages/builtin/marketing/client/hooks/useSite.js";
import {
  useCreateSiteDoc,
  usePublishSiteDoc,
  useSiteDoc,
  useSiteDocsCatalog,
  useUpdateSiteDoc,
} from "../hooks/useSiteDocs.js";
import { slugifyDocTitle } from "../lib/site-doc-list.js";

import { SiteDocCategorySheet } from "./SiteDocCategorySheet.js";
import { SitePublishStatus } from "../../../../packages/builtin/marketing/client/components/SitePublishStatus.js";

/** 分类快捷键：超过这个数就不铺了，下拉比在一排 chip 里找更快。 */
const MAX_CATEGORY_SUGGESTIONS = 8;

/**
 * 文档编辑弹层：create 与 edit 共用。
 *
 * 受控组件——`open` / `onOpenChange` 由父级管理。`doc` 为 null 时是新建，否则编辑该
 * 文档（拉取草稿正文填充表单）。编辑模式下只改草稿列——保存后还需点「发布」才上线，
 * 与页面版式系统同口径。正文区用 `@uiw/react-md-editor`，全屏与预览由其自带工具栏控制。
 */
export function SiteDocEditorSheet({
  open,
  onOpenChange,
  doc,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: SiteDocListItem | null;
  children?: ReactNode;
}): ReactElement {
  const { t } = useTranslation("site-docs");
  const { confirm } = useConfirm();
  const { resolvedTheme } = useTheme();
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const isEdit = Boolean(doc);

  const create = useCreateSiteDoc();
  const update = useUpdateSiteDoc();
  const publish = usePublishSiteDoc();
  // 关闭时不拉全量目录：文档库列表页会常驻挂载本 Sheet，避免每次进页多打 page_size=999
  const docsQuery = useSiteDocsCatalog(open);
  const siteQuery = useSite();
  const defaultLocale = normalizeLocale(siteQuery.data?.default_locale);
  const { data: fullDoc } = useSiteDoc(open && doc ? doc.id : null);
  const {
    form,
    slugTouched,
    setSlugTouched,
    editorKey,
    isDirty,
    isLoading: isLoadingDoc,
    sessionReady,
    commitBaseline,
    patchForm,
  } = useSiteDocEditorForm({
    open,
    doc,
    fullDoc,
    defaultLocale,
  });

  const categories = useMemo(
    () =>
      categoryOptions(
        docsQuery.data?.category_catalog ?? [],
        form.locale,
        defaultLocale,
      ),
    [docsQuery.data?.category_catalog, form.locale, defaultLocale],
  );

  const isSaving = create.isPending || update.isPending || publish.isPending;
  const showSkeleton = isEdit && isLoadingDoc;
  const showForm = sessionReady && !showSkeleton;
  const categoryKeys = useMemo(
    () => new Set(categories.map((category) => category.key)),
    [categories],
  );
  const categorySelectReady =
    !form.category || categoryKeys.has(form.category);

  /** 关闭前拦一道：Esc、点遮罩、点关闭都会走到这里。 */
  const handleOpenChange = useCallback(
    (next: boolean): void => {
      if (next) {
        onOpenChange(true);
        return;
      }
      if (!isDirty) {
        onOpenChange(false);
        return;
      }
      void confirm({
        title: t("siteDocs.discardConfirmTitle"),
        description: t("siteDocs.discardConfirmDescription"),
        confirmText: t("siteDocs.discardConfirm"),
        destructive: true,
      }).then((confirmed) => {
        if (confirmed) onOpenChange(false);
      });
    },
    [confirm, isDirty, onOpenChange, t],
  );

  const submit = useCallback(
    async (publishAfter: boolean): Promise<void> => {
      const payload = {
        slug: form.slug,
        title: form.title,
        description: form.description,
        category: form.category,
        body_md: form.body_md,
        sort_order: form.sort_order,
      };
      try {
        const saved =
          isEdit && doc
            ? await update.mutateAsync({ docId: doc.id, body: payload })
            : // 语言只在新建时定，改不了（见语言字段旁的说明）
              await create.mutateAsync({ ...payload, locale: form.locale });
        if (publishAfter) {
          await publish.mutateAsync(saved.id);
          toast.success(t("siteDocs.publishedToast"));
        } else {
          toast.success(t(isEdit ? "siteDocs.saved" : "siteDocs.created"));
        }
        commitBaseline();
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof ApiError ? error.message : t("siteDocs.saveFailed"),
        );
      }
    },
    [commitBaseline, create, doc, form, isEdit, onOpenChange, publish, t, update],
  );

  const handleTitleChange = useCallback(
    (value: string): void => {
      patchForm((prev) => ({
        ...prev,
        title: value,
        slug: !isEdit && !slugTouched ? slugifyDocTitle(value) : prev.slug,
      }));
    },
    [isEdit, patchForm, slugTouched],
  );

  /** ⌘S / Ctrl+S 保存——正文编辑器里手离不开键盘。 */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLFormElement>): void => {
      if (event.key !== "s" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      if (!isSaving) void submit(false);
    },
    [isSaving, submit],
  );

  const canPublishOnSave = !isEdit || doc?.status !== "published";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {children ? <SheetTrigger asChild>{children}</SheetTrigger> : null}
      <SheetContent
        showCloseButton={false}
        className={cn(
          "gap-0 p-0",
          // twMerge 会按「相同修饰符 + 相同工具类组」把基础样式里的
          // `data-[side=right]:w-3/4` / `sm:max-w-sm` 顶掉，宽度才真的可控
          "data-[side=right]:w-full data-[side=right]:sm:max-w-3xl",
        )}
      >
        <form
          className="flex h-full min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(false);
          }}
          onKeyDown={handleKeyDown}
        >
          <SheetHeader className="flex-row items-start justify-between gap-4 border-b p-4">
            <div className="min-w-0 space-y-0.5">
              <SheetTitle className="flex items-center gap-2">
                {isEdit ? t("siteDocs.editTitle") : t("siteDocs.create")}
                {doc ? (
                  <SitePublishStatus
                    status={doc.status}
                    contentDirty={doc.content_dirty}
                  />
                ) : null}
              </SheetTitle>
              <SheetDescription className="truncate">
                {form.slug ? docPath(form.slug) : t("siteDocs.createHint")}
              </SheetDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("common:close")}
                >
                  <X className="size-4" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>

          {showSkeleton ? (
            <DocFormSkeleton />
          ) : showForm ? (
            <>
              {/*
                元信息压成一行半的网格：原来四个字段纵向堆叠，正文编辑器被挤到
                首屏之外，进来第一眼看不到要写的东西。
              */}
              <div className="grid shrink-0 gap-4 border-b p-4 sm:grid-cols-6">
                <Field className="sm:col-span-3">
                  <FieldLabel htmlFor="doc-title">
                    {t("siteDocs.title")}
                  </FieldLabel>
                  <Input
                    id="doc-title"
                    value={form.title}
                    required
                    autoFocus={!isEdit}
                    onChange={(event) => handleTitleChange(event.target.value)}
                  />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="doc-slug">
                    {t("siteDocs.slug")}
                  </FieldLabel>
                  <Input
                    id="doc-slug"
                    value={form.slug}
                    required
                    placeholder="quickstart"
                    disabled={isEdit}
                    className="font-mono"
                    onChange={(event) => {
                      setSlugTouched(true);
                      patchForm({ slug: event.target.value });
                    }}
                  />
                  {!isEdit ? (
                    <FieldDescription>
                      {t("siteDocs.slugHint")}
                    </FieldDescription>
                  ) : null}
                </Field>
                {/*
                  语言与 slug 一起构成一篇文档的身份：同一个 slug 每种语言各存一行。
                  建好之后不能改——改语言等于把这一行搬到另一组译文里，而那一组可能
                  已经有同 slug 的文档了；要换语言就在目标语言里新建一篇。
                */}
                <Field className="sm:col-span-1">
                  <FieldLabel htmlFor="doc-locale">
                    {t("cms.fieldLocale")}
                  </FieldLabel>
                  <Select
                    value={form.locale}
                    disabled={isEdit}
                    onValueChange={(value) =>
                      patchForm({ locale: value as AppLocale })
                    }
                  >
                    <SelectTrigger id="doc-locale">
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
                </Field>
                <Field className="sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor="doc-category">
                      {t("siteDocs.category")}
                    </FieldLabel>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto px-0"
                      onClick={() => setCategorySheetOpen(true)}
                    >
                      {t("siteDocs.manageCategories")}
                    </Button>
                  </div>
                  {categorySelectReady ? (
                    <Select
                      value={form.category || "__none__"}
                      onValueChange={(value) =>
                        patchForm({
                          category: value === "__none__" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger id="doc-category">
                        <SelectValue placeholder={t("siteDocs.categoryNone")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          {t("siteDocs.categoryNone")}
                        </SelectItem>
                        {!categoryKeys.has(form.category) && form.category ? (
                          <SelectItem value={form.category}>
                            {form.category}
                          </SelectItem>
                        ) : null}
                        {categories.map((category) => (
                          <SelectItem key={category.key} value={category.key}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Skeleton className="h-9 w-full" />
                  )}
                  <CategorySuggestions
                    options={categories}
                    value={form.category}
                    onPick={(category) =>
                      patchForm((prev) => ({
                        ...prev,
                        category: prev.category === category ? "" : category,
                      }))
                    }
                  />
                </Field>
                {/* 排序值决定文档在 /docs 目录里的位置，之前只能靠导入 md 改 */}
                <Field className="sm:col-span-1">
                  <FieldLabel htmlFor="doc-sort-order">
                    {t("siteDocs.sortOrder")}
                  </FieldLabel>
                  <Input
                    id="doc-sort-order"
                    type="number"
                    inputMode="numeric"
                    value={String(form.sort_order)}
                    onChange={(event) =>
                      patchForm({
                        sort_order:
                          Number.parseInt(event.target.value, 10) || 0,
                      })
                    }
                  />
                </Field>
                <Field className="sm:col-span-3">
                  <FieldLabel htmlFor="doc-description">
                    {t("siteDocs.description")}
                  </FieldLabel>
                  <Input
                    id="doc-description"
                    value={form.description}
                    placeholder={t("siteDocs.descriptionPlaceholder")}
                    onChange={(event) =>
                      patchForm({ description: event.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <FieldLabel htmlFor="doc-body">
                    {t("siteDocs.body")}
                  </FieldLabel>
                  <span className="truncate text-xs text-muted-foreground">
                    {t("siteDocs.bodyHint")}
                  </span>
                </div>
                {/*
                  `height="100%"` 让编辑器吃满剩余高度（原来写死 400px，下面
                  一大片空白）。`.w-md-editor-content` 自带 height:100%，在这个
                  flex 列里要改成 flex-1 + min-h-0 才不会把工具条挤扁。
                */}
                <MDEditor
                  key={editorKey}
                  value={form.body_md}
                  height="100%"
                  visibleDragbar={false}
                  preview="edit"
                  data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
                  className="min-h-0 flex-1 [&_.w-md-editor-content]:h-auto [&_.w-md-editor-content]:min-h-0 [&_.w-md-editor-content]:flex-1 [&_.w-md-editor-toolbar]:shrink-0"
                  textareaProps={{
                    // id 挂在真正的 textarea 上，label 才点得动（挂在 MDEditor
                    // 上只会落到外层 div）
                    id: "doc-body",
                    placeholder: t("siteDocs.bodyPlaceholder"),
                  }}
                  onChange={(value, event) => {
                    const next = value ?? "";
                    const trusted = event?.nativeEvent?.isTrusted !== false;
                    patchForm({ body_md: next }, { user: trusted });
                  }}
                />
              </div>
            </>
          ) : null}

          <SheetFooter className="border-t @xl/sheet-content:items-center @xl/sheet-content:justify-between">
            <span className="truncate text-xs text-muted-foreground">
              {isDirty ? t("siteDocs.unsavedHint") : t("siteDocs.saveShortcut")}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  {t("common:cancel")}
                </Button>
              </SheetClose>
              {canPublishOnSave ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving || showSkeleton}
                  onClick={() => void submit(true)}
                >
                  {t("siteDocs.saveAndPublish")}
                </Button>
              ) : null}
              <Button type="submit" disabled={isSaving || showSkeleton}>
                {isSaving ? <Spinner className="size-4" /> : null}
                {t("cms.save")}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
      <SiteDocCategorySheet
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        categories={docsQuery.data?.category_catalog}
      />
    </Sheet>
  );
}

/** 新建入口：trigger + 弹层内聚在一起，与 `SitePageCreateSheet` 同形。 */
export function SiteDocCreateSheet({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <SiteDocEditorSheet open={open} onOpenChange={setOpen} doc={null}>
      {children}
    </SiteDocEditorSheet>
  );
}

/**
 * 已有分类的一键填充。
 *
 * 保留自由输入（分类就是个字符串，租户随时想加新的），chip 只是省掉重复打字——
 * 换成纯下拉反而挡住了「新建分类」这条路。
 */
function CategorySuggestions({
  options,
  value,
  onPick,
}: {
  options: ReadonlyArray<{ key: string; label: string }>;
  value: string;
  onPick: (categoryKey: string) => void;
}): ReactElement | null {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {options.slice(0, MAX_CATEGORY_SUGGESTIONS).map((option) => (
        <Button
          key={option.key}
          type="button"
          size="xs"
          variant={value === option.key ? "secondary" : "ghost"}
          className="text-muted-foreground"
          onClick={() => onPick(option.key)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

/** 拉草稿正文期间的占位——直接铺空表单会让人以为文档是空的。 */
function DocFormSkeleton(): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
      <Skeleton className="min-h-0 flex-1" />
    </div>
  );
}
