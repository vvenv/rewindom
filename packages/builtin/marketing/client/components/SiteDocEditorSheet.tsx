import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import {
  ApiError,
  useConfirm,
  useMediaQuery,
  usePersistState,
} from "@be-water/client-kit";
import {
  DEFAULT_LOCALE,
  getLocaleNativeLabel,
  normalizeLocale,
  type AppLocale,
} from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { Field, FieldDescription, FieldLabel } from "@be-water/ui/field";
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
import { Skeleton } from "@be-water/ui/skeleton";
import { Spinner } from "@be-water/ui/spinner";
import { toast } from "@be-water/ui/toast";
import { cn } from "@be-water/ui/utils";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

import {
  docPath,
  type MarketingDocListItem,
} from "../../shared/marketing-doc.js";
import { siteLocaleOrder } from "../../shared/site-locale.js";
import { useSite } from "../hooks/useSite.js";
import {
  useCreateSiteDoc,
  usePublishSiteDoc,
  useSiteDoc,
  useSiteDocsCatalog,
  useUpdateSiteDoc,
} from "../hooks/useSiteDocs.js";
import { collectDocCategories, slugifyDocTitle } from "../lib/site-doc-list.js";

import { SitePublishStatus } from "./SitePublishStatus.js";

/** 展开态是编辑习惯，不是一次性选择——记住它，别每次打开都要再点一下。 */
const FULLSCREEN_STORAGE_KEY = "site_doc_editor_fullscreen";

/** 分类快捷键：超过这个数就不铺了，手打比在一排 chip 里找更快。 */
const MAX_CATEGORY_SUGGESTIONS = 8;

interface DocFormState {
  slug: string;
  title: string;
  description: string;
  category: string;
  body_md: string;
  sort_order: number;
  locale: AppLocale;
}

function emptyForm(locale: AppLocale = DEFAULT_LOCALE): DocFormState {
  return {
    slug: "",
    title: "",
    description: "",
    category: "",
    body_md: "",
    sort_order: 0,
    locale,
  };
}

function isSameForm(a: DocFormState, b: DocFormState): boolean {
  return (
    a.slug === b.slug &&
    a.title === b.title &&
    a.description === b.description &&
    a.category === b.category &&
    a.body_md === b.body_md &&
    a.sort_order === b.sort_order &&
    a.locale === b.locale
  );
}

/**
 * 文档编辑弹层：create 与 edit 共用，**弹层态 / 全屏态双模式**。
 *
 * 受控组件——`open` / `onOpenChange` 由父级管理。`doc` 为 null 时是新建，否则编辑该
 * 文档（拉取草稿正文填充表单）。编辑模式下只改草稿列——保存后还需点「发布」才上线，
 * 与页面版式系统同口径。
 *
 * 两种模式共用同一棵 DOM，只换 `SheetContent` 的宽度与正文区的预览布局：切换时
 * textarea 不重挂，光标位置、滚动位置、撤销栈都还在。写长文时切全屏（源码 + 预览
 * 并排），回头改个摘要再收回侧栏——这个来回不该让人丢掉正在编辑的上下文。
 */
export function SiteDocEditorSheet({
  open,
  onOpenChange,
  doc,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: MarketingDocListItem | null;
  children?: ReactNode;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();
  const { resolvedTheme } = useTheme();
  const isWide = useMediaQuery("(min-width: 1024px)");
  const [fullscreen, setFullscreen] = usePersistState<boolean>({
    key: FULLSCREEN_STORAGE_KEY,
    defaultValue: false,
  });
  const [form, setForm] = useState<DocFormState>(emptyForm());
  const [baseline, setBaseline] = useState<DocFormState>(emptyForm());
  const [slugTouched, setSlugTouched] = useState(false);
  const isEdit = Boolean(doc);

  const create = useCreateSiteDoc();
  const update = useUpdateSiteDoc();
  const publish = usePublishSiteDoc();
  // 关闭时不拉全量目录：文档库列表页会常驻挂载本 Sheet，避免每次进页多打 page_size=999
  const docsQuery = useSiteDocsCatalog(open);
  const siteQuery = useSite();
  const defaultLocale = normalizeLocale(siteQuery.data?.default_locale);
  const { data: fullDoc, isLoading: isLoadingDoc } = useSiteDoc(
    open && doc ? doc.id : null,
  );

  const categories = useMemo(
    () => collectDocCategories(docsQuery.data ?? []),
    [docsQuery.data],
  );

  /**
   * 只在「换了一篇文档」时灌表单。
   *
   * 之前是 `[open, doc, fullDoc]` 一变就 `setForm`：保存会 `setQueryData` 刷新
   * `fullDoc`，于是正在编辑的内容被服务端返回值盖掉。这里用 ref 记住已经灌过哪一篇。
   */
  const loadedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      loadedIdRef.current = null;
      return;
    }
    if (doc) {
      if (!fullDoc || loadedIdRef.current === fullDoc.id) return;
      const next: DocFormState = {
        slug: fullDoc.slug,
        title: fullDoc.title_draft,
        description: fullDoc.description_draft,
        category: fullDoc.category_draft,
        body_md: fullDoc.body_md_draft,
        sort_order: fullDoc.sort_order_draft,
        locale: fullDoc.locale,
      };
      setForm(next);
      setBaseline(next);
      setSlugTouched(true);
      loadedIdRef.current = fullDoc.id;
      return;
    }
    if (loadedIdRef.current === "new") return;
    setForm(emptyForm(defaultLocale));
    setBaseline(emptyForm(defaultLocale));
    setSlugTouched(false);
    loadedIdRef.current = "new";
  }, [open, doc, fullDoc, defaultLocale]);

  const isDirty = !isSameForm(form, baseline);
  const isSaving = create.isPending || update.isPending || publish.isPending;
  const showSkeleton = isEdit && isLoadingDoc;

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
        setBaseline(form);
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof ApiError ? error.message : t("siteDocs.saveFailed"),
        );
      }
    },
    [create, doc, form, isEdit, onOpenChange, publish, t, update],
  );

  const handleTitleChange = useCallback(
    (value: string): void => {
      setForm((prev) => ({
        ...prev,
        title: value,
        // 新建且用户没自己动过 slug 时联动；slug 保存后不可改，编辑态不参与
        slug: !isEdit && !slugTouched ? slugifyDocTitle(value) : prev.slug,
      }));
    },
    [isEdit, slugTouched],
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
          "data-[side=right]:w-full",
          fullscreen
            ? "data-[side=right]:sm:max-w-none"
            : "data-[side=right]:sm:max-w-3xl",
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
              {/* 窄屏的弹层本来就快占满整屏，没有可展开的余地 */}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="hidden md:inline-flex"
                title={t(
                  fullscreen
                    ? "siteDocs.exitFullscreen"
                    : "siteDocs.fullscreen",
                )}
                aria-label={t(
                  fullscreen
                    ? "siteDocs.exitFullscreen"
                    : "siteDocs.fullscreen",
                )}
                aria-pressed={fullscreen}
                onClick={() => setFullscreen((prev) => !prev)}
              >
                {fullscreen ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
              </Button>
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
          ) : (
            <>
              {/*
                元信息压成一行半的网格：原来四个字段纵向堆叠，正文编辑器被挤到
                首屏之外，进来第一眼看不到要写的东西。全屏时再摊成一行。
              */}
              <div
                className={cn(
                  // 各列跨度合计 12：6 栏时排两行，全屏 12 栏时并成一行
                  "grid shrink-0 gap-4 border-b p-4 sm:grid-cols-6",
                  fullscreen && "xl:grid-cols-12",
                )}
              >
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
                      setForm((prev) => ({
                        ...prev,
                        slug: event.target.value,
                      }));
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
                      setForm((prev) => ({
                        ...prev,
                        locale: value as AppLocale,
                      }))
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
                  <FieldLabel htmlFor="doc-category">
                    {t("siteDocs.category")}
                  </FieldLabel>
                  <Input
                    id="doc-category"
                    value={form.category}
                    placeholder={t("siteDocs.categoryPlaceholder")}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        category: event.target.value,
                      }))
                    }
                  />
                  <CategorySuggestions
                    categories={categories}
                    value={form.category}
                    onPick={(category) =>
                      setForm((prev) => ({
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
                      setForm((prev) => ({
                        ...prev,
                        sort_order:
                          Number.parseInt(event.target.value, 10) || 0,
                      }))
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
                      setForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
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
                  `height="100%"` 让编辑器吃满剩余高度（原来写死 400px，全屏时下面
                  一大片空白）。`.w-md-editor-content` 自带 height:100%，在这个
                  flex 列里要改成 flex-1 + min-h-0 才不会把工具条挤扁。
                */}
                <MDEditor
                  value={form.body_md}
                  height="100%"
                  visibleDragbar={false}
                  preview={fullscreen && isWide ? "live" : "edit"}
                  data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
                  className="min-h-0 flex-1 [&_.w-md-editor-content]:h-auto [&_.w-md-editor-content]:min-h-0 [&_.w-md-editor-content]:flex-1 [&_.w-md-editor-toolbar]:shrink-0"
                  textareaProps={{
                    // id 挂在真正的 textarea 上，label 才点得动（挂在 MDEditor
                    // 上只会落到外层 div）
                    id: "doc-body",
                    placeholder: t("siteDocs.bodyPlaceholder"),
                  }}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, body_md: value ?? "" }))
                  }
                />
              </div>
            </>
          )}

          <SheetFooter className="flex-row items-center justify-between gap-3 border-t p-4">
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
  categories,
  value,
  onPick,
}: {
  categories: readonly string[];
  value: string;
  onPick: (category: string) => void;
}): ReactElement | null {
  if (categories.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {categories.slice(0, MAX_CATEGORY_SUGGESTIONS).map((category) => (
        <Button
          key={category}
          type="button"
          size="xs"
          variant={value === category ? "secondary" : "ghost"}
          className="text-muted-foreground"
          onClick={() => onPick(category)}
        >
          {category}
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
