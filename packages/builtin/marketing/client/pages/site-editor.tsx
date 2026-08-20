import { useEffect, useMemo, useState } from "react";

import { PageLayout, useConfirm, usePermissions } from "@rewindom/client-kit";
import { getLocaleNativeLabel } from "@rewindom/shared";
import { Button } from "@rewindom/ui/button";
import { ButtonGroup } from "@rewindom/ui/button-group";
import { Spinner } from "@rewindom/ui/spinner";
import { cn } from "@rewindom/ui/utils";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Monitor,
  Palette,
  Smartphone,
  Tablet,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import {
  getSectionDefinition,
  localizeSections,
  type SiteSection,
} from "../../shared/section-schema.js";
import { collectHeaderNavItems } from "../../shared/sections/_common/chrome-blocks.js";
import { collectSectionTypes } from "../../shared/sections/collect-types.js";
import { siteNavPages } from "../../shared/site-cms.js";
import { normalizeHomePath, pageIdAtHomePath } from "../../shared/site-home.js";
import { withSiteLocale } from "../../shared/site-locale.js";
import { SiteThemeSettingsForm } from "../components/appearance/SiteThemeSettingsForm.js";
import { TenantSiteView } from "../components/TenantSiteView.js";
import { EditorToolbar } from "../components/theme-editor/EditorToolbar.js";
import { PageEditorToolbar } from "../components/theme-editor/PageEditorToolbar.js";
import { PageMetaForm } from "../components/theme-editor/PageMetaForm.js";
import {
  PreviewFrame,
  type PreviewDevice,
} from "../components/theme-editor/PreviewFrame.js";
import { SectionSettingsForm } from "../components/theme-editor/SectionSettingsForm.js";
import { SectionTree } from "../components/theme-editor/SectionTree.js";
import { SiteNavPreviewProvider } from "../components/theme-editor/site-nav-preview-context.js";
import { SiteAccountEntryPreview } from "../components/theme-editor/SiteAccountEntryPreview.js";
import { resolveEditorContexts } from "../editor-context-providers.js";
import { useSiteEditorPage } from "../hooks/use-site-editor-page.js";
import { clearEditorCache, useSiteEditor } from "../hooks/use-site-editor.js";
import { useSitePage, useSitePages } from "../hooks/useSite.js";
import { resolveEditorPublishState } from "../lib/editor-publish-state.js";
import { sectionTypeLabel } from "../lib/section-type-label.js";
import { siteEditorPath } from "../lib/site-editor-url.js";
import { siteMemberEntrySlot } from "../shell/site-member-slots.js";

const DEVICE_ICONS: Array<[PreviewDevice, LucideIcon]> = [
  ["desktop", Monitor],
  ["tablet", Tablet],
  ["mobile", Smartphone],
];

/** 选中项的类型名（「功能墙」/「功能」），给预览高亮当标签用。 */
function selectionTypeLabel(
  section: SiteSection,
  blockId: string | null,
  t: (key: string) => string,
): string {
  const sectionLabel = sectionTypeLabel(t, section.type);
  if (!blockId) return sectionLabel;
  const block = section.blocks.find((item) => item.id === blockId);
  const blockDef = getSectionDefinition(section.type)?.blocks?.find(
    (item) => item.type === block?.type,
  );
  return blockDef ? t(blockDef.label) : (block?.type ?? sectionLabel);
}

/**
 * 站点编辑器：页面区块与页头页脚在这里改；外观是同一套壳的另一层入口。
 *
 * 共用一块预览、一条发布链。入口拆开是因为主题不是树上的对象——从官网卡片「外观」
 * 进来（`?scope=theme`），不必先点进某一页；页面行只打开区块树（`?page=`）。
 *
 * 保存 / 发布只有两枚按钮：有页面时正文与站点级草稿同事务落库，没有页面时只落站点级
 * （外观走这条）。改完先存草稿、发布才对访客生效。
 */
export function SiteEditor() {
  const navigate = useNavigate();
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const { confirm } = useConfirm();
  const canWrite = hasPermission("site.write");
  const { pageId: urlPageId, scope } = useSiteEditorPage();
  const isTheme = scope === "theme";
  // 外观不编辑某一页：旧书签若带了 `page` 也忽略，避免保存时把正文草稿一起写进去。
  const pageId = isTheme ? undefined : urlPageId;
  const editor = useSiteEditor(pageId);
  const pagesQuery = useSitePages();
  const homePageId = isTheme
    ? pageIdAtHomePath(
        pagesQuery.data ?? [],
        editor.siteQuery.data?.home_path ?? "/",
        editor.locale,
      )
    : undefined;
  const homePageQuery = useSitePage(homePageId);
  const previewSections =
    isTheme && homePageQuery.data
      ? localizeSections(
          homePageQuery.data.sections,
          editor.locale,
          editor.defaultLocale,
        )
      : editor.previewSections;
  const previewPath = isTheme
    ? withSiteLocale(
        normalizeHomePath(editor.siteQuery.data?.home_path ?? "/"),
        editor.locale,
        editor.defaultLocale,
      )
    : editor.path;
  const previewPageSettings = isTheme
    ? (homePageQuery.data?.settings ?? {})
    : editor.pageSettings;
  const previewPageKind = isTheme
    ? homePageQuery.data?.kind
    : editor.page?.kind;
  const usedTypes = useMemo(() => {
    const types = collectSectionTypes(editor.header);
    collectSectionTypes(editor.footer, types);
    collectSectionTypes(previewSections, types);
    return types;
  }, [editor.header, editor.footer, previewSections]);
  const usedTypesKey = [...usedTypes].sort().join(",");
  const { data: editorCtx = {} } = useQuery({
    queryKey: [
      "marketing-editor-contexts",
      editor.locale,
      editor.defaultLocale,
      previewPageKind,
      usedTypesKey,
      editor.siteQuery.data?.home_path,
      editor.siteQuery.data?.home_layout_key,
    ],
    queryFn: () =>
      resolveEditorContexts({
        locale: editor.locale,
        defaultLocale: editor.defaultLocale,
        pageKind: previewPageKind,
        usedTypes,
        homePath: editor.siteQuery.data?.home_path,
        homeLayoutKey: editor.siteQuery.data?.home_layout_key,
      }),
  });
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const { selectedSectionId, selectedBlockId } = editor;
  // 页头区里的段一律滚到顶部：页头本体是 sticky，scrollIntoView 会判定「已在视口内」
  const headerIds = editor.header.map((section) => section.id).join(",");

  useEffect(() => {
    if (isTheme || !previewDoc || !selectedSectionId) return;
    if (headerIds.split(",").includes(selectedSectionId)) {
      previewDoc.defaultView?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // 选中的是块就滚到块：一个长段（六张卡片的功能墙）滚到段首，选中的那张
    // 卡片可能还在视口外，高亮框跟着画在看不见的地方。
    const selector = selectedBlockId
      ? `[data-block-id="${CSS.escape(selectedBlockId)}"]`
      : `[data-section-id="${CSS.escape(selectedSectionId)}"]`;
    previewDoc
      .querySelector(selector)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [isTheme, previewDoc, selectedSectionId, selectedBlockId, headerIds]);

  const shell = (children: React.ReactNode) => (
    <PageLayout
      icon={Palette}
      title={isTheme ? t("editor.scope.theme") : t("editor.title")}
      description={
        isTheme ? t("editor.scope.themeHint") : t("editor.pageDescription")
      }
    >
      {children}
    </PageLayout>
  );

  if (editor.siteQuery.isLoading || (pageId && editor.pageQuery.isLoading)) {
    return shell(
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>,
    );
  }

  // 页面没了（被删 / 链接过期）不该整页失败：站点级那两层照样能编，退回不带页面即可
  const pageMissing = Boolean(pageId) && !editor.page;

  if (editor.siteQuery.isError || !editor.previewSite) {
    return shell(
      <>
        <p className="text-sm text-destructive">{t("cms.loadFailed")}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/app/site">
            <ArrowLeft className="size-4" />
            {t("editor.back")}
          </Link>
        </Button>
      </>,
    );
  }

  const page = editor.page;
  const accountEntryAvailable = editor.capabilities.account_entry;
  const selectedSection = editor.selectedSection;
  /** 预览高亮左上角那枚标签：选中块时报块的类型名，否则报段的。 */
  const highlightLabel = selectedSection
    ? selectionTypeLabel(selectedSection, editor.selectedBlockId, t)
    : undefined;
  const saving =
    editor.mutations.saveEditorDraft.isPending ||
    editor.mutations.saveSiteDraft.isPending;
  const publishing =
    editor.mutations.publishDraft.isPending ||
    editor.mutations.publishSiteDraft.isPending;
  const reverting =
    editor.mutations.revertDraft.isPending ||
    editor.mutations.revertSiteDraft.isPending;
  const publishState = resolveEditorPublishState({
    dirty: editor.dirty,
    // 没打开页面时只有站点级那条链，走 chrome 口径（默认值即「已上线的那一份」）
    ...(page
      ? {
          published: page.status === "published",
          contentDirty: editor.contentDirty,
        }
      : { scope: "chrome" as const }),
    // 页头页脚 / 主题与正文同属一条发布链：只改了页头也要算「有未发布的更改」，
    // 否则状态点会报「线上已是最新」，而访客看到的还是旧页头
    chromeDirty: editor.siteDraftDirty,
  });

  /** 离开当前草稿（返回列表 / 换页 / 换语言）都会把没存的改动丢掉，先问一句。 */
  const leaveTo = async (to: string): Promise<void> => {
    if (editor.dirty) {
      const confirmed = await confirm({
        title: t("editor.leaveConfirmTitle"),
        description: t("editor.leaveConfirmBody"),
        confirmText: t("editor.leaveConfirmAction"),
        destructive: true,
      });
      if (!confirmed) return;
    }
    void navigate(to);
  };

  const goToPage = (nextPageId: string): void => {
    if (nextPageId === pageId) return;
    void leaveTo(siteEditorPath({ pageId: nextPageId }));
  };

  /**
   * 保存：有页面时正文与站点级草稿一次事务落库；没有页面就只落站点级。
   * 两条路都带上主题——它现在是站点级草稿的一部分。
   */
  const save = (): void => {
    const onSuccess = (): void => {
      clearEditorCache(pageId);
      toast.success(t("editor.toastSaved"));
    };
    const onError = (): void => {
      toast.error(t("editor.toastSaveFailed"));
    };

    if (pageId && page) {
      // 服务端也拦（标题与描述都必填），但拦下来只会弹一句「保存失败」——
      // 缺哪一样得当场说清楚，右栏「页面设置」里就是这两个框
      if (!editor.title.trim()) {
        toast.error(t("editor.toastTitleRequired"));
        return;
      }
      if (!editor.description.trim()) {
        toast.error(t("editor.toastDescriptionRequired"));
        return;
      }
      editor.mutations.saveEditorDraft.mutate(
        {
          pageId,
          body: {
            title: editor.title.trim(),
            description: editor.description.trim(),
            sections: editor.sections,
            header: editor.header,
            footer: editor.footer,
            settings: editor.pageSettings,
            visibility: editor.visibility,
            theme_settings: editor.theme,
            ...(editor.themeKey ? { theme_key: editor.themeKey } : {}),
          },
        },
        { onSuccess, onError },
      );
      return;
    }

    editor.mutations.saveSiteDraft.mutate(
      {
        header: editor.header,
        footer: editor.footer,
        theme_settings: editor.theme,
        ...(editor.themeKey ? { theme_key: editor.themeKey } : {}),
      },
      { onSuccess, onError },
    );
  };

  /**
   * 「发布」只有一枚：把这次编辑的东西整个上线——本页正文与站点级的页头页脚 / 主题
   * 一起（服务端同一事务）；页面还没上线的话顺带上线。对用户就是一件事：
   * 让访客看到的等于眼前这一版。
   */
  const publish = (): void => {
    const onSuccess = (): void => {
      toast.success(t("editor.toastPublished"));
    };
    const onError = (): void => {
      toast.error(t("editor.toastPublishFailed"));
    };
    if (pageId && page) {
      editor.mutations.publishDraft.mutate(pageId, { onSuccess, onError });
      return;
    }
    editor.mutations.publishSiteDraft.mutate(undefined, { onSuccess, onError });
  };

  /** 丢掉内存里这一版，回到库里已保存的草稿（不碰服务端）。 */
  const discardLocal = async (): Promise<void> => {
    const confirmed = await confirm({
      title: t("editor.discardLocalConfirmTitle"),
      description: t("editor.discardLocalConfirmBody"),
      confirmText: t("editor.discardLocalConfirmAction"),
      destructive: true,
    });
    if (!confirmed) return;
    editor.discardLocalChanges();
    toast.success(t("editor.toastLocalDiscarded"));
  };

  /**
   * 撤销未发布的更改：草稿回到线上那一版（同一事务）。
   * 重新灌入时内存里没保存的改动一并作废——所以要连着问。
   */
  const revert = async (): Promise<void> => {
    const body = t("editor.revertConfirmBody");
    const confirmed = await confirm({
      title: t("editor.revertConfirmTitle"),
      description: editor.dirty
        ? `${body}${t("editor.revertDiscardsUnsavedToo")}`
        : body,
      confirmText: t("editor.revertConfirmAction"),
      destructive: true,
    });
    if (!confirmed) return;
    const onSuccess = (): void => {
      clearEditorCache(pageId);
      toast.success(t("editor.toastReverted"));
    };
    const onError = (): void => {
      toast.error(t("editor.toastRevertFailed"));
    };
    if (pageId && page) {
      editor.mutations.revertDraft.mutate(pageId, { onSuccess, onError });
      return;
    }
    editor.mutations.revertSiteDraft.mutate(undefined, { onSuccess, onError });
  };

  const unpublish = (): void => {
    if (!page) return;
    editor.mutations.unpublishPage.mutate(page.id, {
      onSuccess: () => toast.success(t("cms.toastPageUnpublished")),
      onError: () => toast.error(t("cms.toastPagePublishFailed")),
    });
  };

  /**
   * 重设为最新内置版式：服务端按已保存草稿合并，结果只写草稿。
   * 内存里没存的改动灌不进去，确认时说清楚；成功后清 session 再灌入。
   */
  const resetPreset = async (): Promise<void> => {
    if (!page) return;
    const body = t("cms.resetPresetConfirmDescription", {
      title: editor.title || page.title,
    });
    const confirmed = await confirm({
      title: t("cms.resetPresetConfirmTitle"),
      description: editor.dirty
        ? `${body}${t("editor.revertDiscardsUnsavedToo")}`
        : body,
      confirmText: t("cms.resetPreset"),
    });
    if (!confirmed) return;
    editor.mutations.resetPagePreset.mutate(page.id, {
      onSuccess: () => {
        clearEditorCache(pageId);
        editor.discardLocalChanges();
        toast.success(t("cms.toastPageResetToPreset"));
      },
      onError: () => toast.error(t("cms.toastPageResetToPresetFailed")),
    });
  };

  const previewView = (
    <TenantSiteView
      embedded
      site={editor.previewSite}
      path={previewPath}
      sections={previewSections}
      alternates={editor.previewAlternates}
      pageSettings={previewPageSettings}
      headerOverride={editor.header}
      footerOverride={editor.footer}
      contributed={editorCtx}
      enabledEntitlements={editor.capabilities.entitlements}
      onSelectSection={
        isTheme
          ? undefined
          : (sectionId, blockId) => editor.selectSection(sectionId, blockId)
      }
    />
  );

  const toolbar =
    page && pageId ? (
      <PageEditorToolbar
        page={page}
        currentTitle={editor.title || page.title}
        localePages={editor.localePages}
        localeVariants={editor.localeVariants}
        locale={editor.locale}
        state={publishState}
        canWrite={canWrite}
        pending={{ saving, publishing, reverting }}
        onGoToPage={goToPage}
        onDuplicated={(created) =>
          void navigate(siteEditorPath({ pageId: created.id }))
        }
        onSave={save}
        onPublish={publish}
        onUnpublish={unpublish}
        onDiscardLocal={() => void discardLocal()}
        onRevert={() => void revert()}
        onResetPreset={() => void resetPreset()}
        resetPresetPending={editor.mutations.resetPagePreset.isPending}
      />
    ) : (
      <EditorToolbar
        state={publishState}
        canWrite={canWrite}
        pending={{ saving, publishing, reverting }}
        publishLabelKey="editor.publishSite"
        onSave={save}
        onPublish={publish}
        onDiscardLocal={() => void discardLocal()}
        onRevert={() => void revert()}
      />
    );

  return (
    <SiteNavPreviewProvider
      value={{
        navPages: siteNavPages(editor.previewSite?.pages ?? []).map((item) => ({
          path: item.path,
          title: item.title,
        })),
        contributed: editorCtx,
        enabledEntitlements: editor.capabilities.entitlements,
        headerItems: collectHeaderNavItems(editor.header),
      }}
    >
      <PageLayout
        icon={Palette}
        title={isTheme ? t("editor.scope.theme") : t("editor.title")}
        description={
          isTheme
            ? t("editor.scope.themeHint")
            : page
              ? editor.title || page.title || t("cms.untitledPage")
              : t("editor.pageDescription")
        }
        fill
        backLink={
          isTheme ? { to: "/app/site", label: t("editor.back") } : undefined
        }
        action={toolbar}
      >
        {/* 栏各自滚：页面不整体滚动，预览区吃满剩余高度 */}
        <div
          className={cn(
            "-mx-1 grid gap-3 lg:h-full lg:min-h-0 lg:grid-rows-[minmax(0,1fr)]",
            isTheme
              ? "lg:grid-cols-[minmax(0,1fr)_300px]"
              : "lg:grid-cols-[240px_minmax(0,1fr)_300px]",
          )}
        >
          {isTheme ? null : (
            <div className="flex min-h-0 flex-col gap-2">
              {pageMissing ? (
                <p className="px-1 text-xs text-destructive">
                  {t("editor.pageMissing")}
                </p>
              ) : null}

              {/*
                没打开页面时页头页脚的文案仍要能逐语言校对——它们是逐字段翻译的，
                不依赖任何一行页面。有页面时语言由那一行决定，换语言 = 换页（工具栏里）。
              */}
              {!page && editor.localeVariants.length > 1 ? (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-muted-foreground">
                    {t("chromeEditor.editLocale")}
                  </span>
                  <ButtonGroup>
                    {editor.localeVariants.map((variant) => (
                      <Button
                        key={variant.locale}
                        type="button"
                        size="sm"
                        variant={
                          variant.locale === editor.locale
                            ? "secondary"
                            : "outline"
                        }
                        aria-pressed={variant.locale === editor.locale}
                        onClick={() => editor.setLocale(variant.locale)}
                      >
                        {getLocaleNativeLabel(variant.locale)}
                      </Button>
                    ))}
                  </ButtonGroup>
                </div>
              ) : null}

              <SectionTree
                chromeOnly={!page}
                entitlements={editor.capabilities.entitlements}
                isDefaultTenant={editor.capabilities.is_default_tenant}
                pageKind={editor.page?.kind}
                sections={editor.sections}
                header={editor.header}
                footer={editor.footer}
                selectedSectionId={editor.selectedSectionId}
                selectedBlockId={editor.selectedBlockId}
                metaSelected={editor.metaSelected}
                canWrite={canWrite}
                onSelect={editor.selectSection}
                onSelectMeta={editor.selectMeta}
                onAddSection={editor.addSection}
                onRemoveSection={editor.removeSection}
                onMoveSection={editor.moveSection}
                onMoveSectionTo={editor.moveSectionTo}
                onAddBlock={editor.addBlock}
                onRemoveBlock={editor.removeBlock}
                onMoveBlock={editor.moveBlock}
                onReorderBlock={editor.reorderBlock}
              />
            </div>
          )}

          <div className="flex h-[70vh] flex-col overflow-hidden rounded-lg border bg-background lg:h-full">
            <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
              <span className="truncate">
                {t("editor.preview")} · {previewPath}
              </span>
              {isTheme && editor.localeVariants.length > 1 ? (
                <ButtonGroup>
                  {editor.localeVariants.map((variant) => (
                    <Button
                      key={variant.locale}
                      type="button"
                      size="sm"
                      variant={
                        variant.locale === editor.locale
                          ? "secondary"
                          : "outline"
                      }
                      aria-pressed={variant.locale === editor.locale}
                      onClick={() => editor.setLocale(variant.locale)}
                    >
                      {getLocaleNativeLabel(variant.locale)}
                    </Button>
                  ))}
                </ButtonGroup>
              ) : null}
              <ButtonGroup className="ml-auto">
                {DEVICE_ICONS.map(([key, Icon]) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={device === key ? "secondary" : "outline"}
                    aria-pressed={device === key}
                    title={t(`editor.device.${key}`)}
                    className="size-7"
                    onClick={() => setDevice(key)}
                  >
                    <Icon className="size-3.5" />
                    <span className="sr-only">{t(`editor.device.${key}`)}</span>
                  </Button>
                ))}
              </ButtonGroup>
            </div>
            <PreviewFrame
              device={device}
              onDocumentChange={setPreviewDoc}
              highlightSectionId={isTheme ? null : editor.selectedSectionId}
              highlightBlockId={isTheme ? null : editor.selectedBlockId}
              highlightLabel={isTheme ? undefined : highlightLabel}
            >
              {/*
                页头的会员入口在站点前台由 site-member 填进 slot；编辑器在工作台
                外壳里拿不到那份 Provider，所以自己灌一个访客态的静态预览。

                **只在本站真的开通了会员时才灌**：以前无条件灌，于是没开通的站点
                预览里挂着一枚「登录」，线上却什么都没有——预览撒的谎正是「账户入口
                坏了」这个印象的来源。没开通时右侧那个开关也会被置灰并写明原因。
              */}
              {accountEntryAvailable ? (
                <siteMemberEntrySlot.Provider
                  component={SiteAccountEntryPreview}
                >
                  {previewView}
                </siteMemberEntrySlot.Provider>
              ) : (
                previewView
              )}
            </PreviewFrame>
          </div>

          <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
            {isTheme ? (
              <SiteThemeSettingsForm
                theme={editor.theme}
                themeKey={editor.themeKey}
                canWrite={canWrite}
                onChange={editor.setTheme}
                onThemeKeyChange={editor.setThemeKey}
              />
            ) : editor.metaSelected && page ? (
              <PageMetaForm
                title={editor.title}
                description={editor.description}
                kind={page.kind}
                entitlements={editor.capabilities.entitlements}
                site={editor.previewSite}
                locale={editor.locale}
                path={editor.path}
                settings={editor.pageSettings}
                visibility={editor.visibility}
                membersOnlyAvailable={accountEntryAvailable}
                disabled={!canWrite}
                onChangeTitle={editor.setTitle}
                onChangeDescription={editor.setDescription}
                onChangeSettings={editor.setPageSettings}
                onChangeVisibility={editor.setVisibility}
              />
            ) : selectedSection ? (
              <SectionSettingsForm
                section={selectedSection}
                blockId={editor.selectedBlockId}
                disabled={!canWrite}
                unavailable={
                  accountEntryAvailable
                    ? undefined
                    : { chrome_account: t("editor.accountEntryUnavailable") }
                }
                locale={editor.locale}
                defaultLocale={editor.defaultLocale}
                pageKind={editor.page?.kind}
                entitlements={editor.capabilities.entitlements}
                site={editor.previewSite}
                onChangeSettings={(settings) =>
                  editor.updateSettings(selectedSection.id, settings)
                }
                onChangeBlockSettings={(blockId, settings) =>
                  editor.updateBlockSettings(
                    selectedSection.id,
                    blockId,
                    settings,
                  )
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("editor.selectSection")}
              </p>
            )}
          </aside>
        </div>
      </PageLayout>
    </SiteNavPreviewProvider>
  );
}
