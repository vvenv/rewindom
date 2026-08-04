import { useEffect, useState } from "react";

import { PageLayout, useConfirm, usePermissions } from "@be-water/client-kit";
import { getLocaleNativeLabel } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { ButtonGroup } from "@be-water/ui/button-group";
import { Spinner } from "@be-water/ui/spinner";
import {
  ArrowLeft,
  Copy,
  Monitor,
  Palette,
  Smartphone,
  Tablet,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { SitePageDuplicateSheet } from "../components/SitePageDuplicateSheet.js";
import { TenantSiteView } from "../components/TenantSiteView.js";
import { PageMetaForm } from "../components/theme-editor/PageMetaForm.js";
import { PageSwitcher } from "../components/theme-editor/PageSwitcher.js";
import { PresetMenu } from "../components/theme-editor/PresetMenu.js";
import {
  PreviewFrame,
  type PreviewDevice,
} from "../components/theme-editor/PreviewFrame.js";
import { SectionSettingsForm } from "../components/theme-editor/SectionSettingsForm.js";
import { SectionTree } from "../components/theme-editor/SectionTree.js";
import { useSiteThemeEditor, clearEditorCache } from "../hooks/use-site-theme-editor.js";

const DEVICE_ICONS: Array<[PreviewDevice, LucideIcon]> = [
  ["desktop", Monitor],
  ["tablet", Tablet],
  ["mobile", Smartphone],
];

export function SiteThemeEditor() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const { confirm } = useConfirm();
  const canWrite = hasPermission("site.write");
  const editor = useSiteThemeEditor(pageId);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const { selectedSectionId } = editor;
  // 页头区里的段一律滚到顶部：页头本体是 sticky，scrollIntoView 会判定「已在视口内」
  const headerIds = editor.header.map((section) => section.id).join(",");

  // 左侧树选中后把预览滚到对应区块；页头是 sticky，scrollIntoView 会判定
  // 「已在视口内」而不动，所以单独滚到顶部。
  useEffect(() => {
    if (!previewDoc || !selectedSectionId) return;
    if (headerIds.split(",").includes(selectedSectionId)) {
      previewDoc.defaultView?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    previewDoc
      .querySelector(`[data-section-id="${CSS.escape(selectedSectionId)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [previewDoc, selectedSectionId, headerIds]);

  if (editor.pageQuery.isLoading || editor.siteQuery.isLoading) {
    return (
      <PageLayout
        icon={Palette}
        title={t("editor.title")}
        description={t("cms.pageDescription")}
      >
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      </PageLayout>
    );
  }

  if (editor.pageQuery.isError || !editor.page || !editor.previewSite) {
    return (
      <PageLayout
        icon={Palette}
        title={t("editor.title")}
        description={t("cms.pageDescription")}
      >
        <p className="text-sm text-destructive">{t("cms.loadFailed")}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/site">
            <ArrowLeft className="size-4" />
            {t("editor.back")}
          </Link>
        </Button>
      </PageLayout>
    );
  }

  const page = editor.page;
  const selectedSection = editor.selectedSection;
  const saving = editor.mutations.saveEditorDraft.isPending;
  const publishingChrome = editor.mutations.publishChrome.isPending;
  const publishingContent = editor.mutations.publishPageContent.isPending;

  /**
   * 离开当前草稿（返回列表 / 换页 / 换语言）都会把没存的改动丢掉，先问一句。
   */
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
    void leaveTo(`/site/pages/${nextPageId}`);
  };

  /** 页面 sections 与站点级页头页脚一次事务落库，避免半截状态。 */
  const saveAll = (): void => {
    if (!pageId) return;
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
        },
      },
      {
        onSuccess: () => {
          if (pageId) clearEditorCache(pageId);
          toast.success(t("editor.toastSaved"));
        },
        onError: () => toast.error(t("editor.toastSaveFailed")),
      },
    );
  };

  const publishChrome = (): void => {
    editor.mutations.publishChrome.mutate(undefined, {
      onSuccess: () => toast.success(t("editor.toastChromePublished")),
      onError: () => toast.error(t("editor.toastChromePublishFailed")),
    });
  };

  const publishPageContent = (): void => {
    if (!pageId) return;
    editor.mutations.publishPageContent.mutate(pageId, {
      onSuccess: () => toast.success(t("editor.toastContentPublished")),
      onError: () => toast.error(t("editor.toastContentPublishFailed")),
    });
  };

  return (
    <PageLayout
      icon={Palette}
      title={t("editor.title")}
      description={editor.title || page.title}
      fill
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void leaveTo("/site")}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden md:inline">{t("editor.back")}</span>
          </Button>
          {/* 同语言下的其它页面：改完一页直接切下一页，不用退回列表 */}
          <PageSwitcher
            pages={editor.localePages}
            currentPageId={page.id}
            currentTitle={editor.title || page.title}
            onSelect={goToPage}
          />
          {/*
            切语言 = 切到同 slug 的**另一行页面**（页面按语言分行存），所以是导航
            而不是本地状态。还没建那一行时置灰，提示去页面列表新建。
          */}
          {editor.localeVariants.length > 1 ? (
            <ButtonGroup>
              {editor.localeVariants.map((variant) => {
                const active = variant.locale === editor.locale;
                return (
                  <Button
                    key={variant.locale}
                    size="sm"
                    variant={active ? "secondary" : "outline"}
                    aria-pressed={active}
                    disabled={variant.pageId === null}
                    title={
                      variant.pageId === null
                        ? t("editor.locale.missing")
                        : getLocaleNativeLabel(variant.locale)
                    }
                    onClick={() => {
                      if (variant.pageId) void goToPage(variant.pageId);
                    }}
                  >
                    {getLocaleNativeLabel(variant.locale)}
                  </Button>
                );
              })}
            </ButtonGroup>
          ) : null}
          {canWrite ? (
            <>
              {/* 复制到另一种语言后直接跳过去接着译 */}
              <SitePageDuplicateSheet
                page={page}
                onDuplicated={(created) =>
                  void navigate(`/site/pages/${created.id}`)
                }
              >
                <Button size="sm" variant="outline">
                  <Copy className="size-4" />
                  <span className="hidden md:inline">{t("cms.duplicate")}</span>
                </Button>
              </SitePageDuplicateSheet>
              <PresetMenu
                hasContent={editor.sections.length > 0}
                onApply={editor.replaceSections}
              />
              {editor.chromeDirty ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={publishingChrome}
                  onClick={publishChrome}
                >
                  {publishingChrome && <Spinner className="size-4" />}
                  {t("editor.publishChrome")}
                </Button>
              ) : null}
              {page.status === "published" && editor.contentDirty ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={publishingContent}
                  onClick={publishPageContent}
                >
                  {publishingContent && <Spinner className="size-4" />}
                  {t("editor.publishContent")}
                </Button>
              ) : null}
              {page.status === "published" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    editor.mutations.unpublishPage.mutate(page.id, {
                      onSuccess: () =>
                        toast.success(t("cms.toastPageUnpublished")),
                      onError: () =>
                        toast.error(t("cms.toastPagePublishFailed")),
                    })
                  }
                >
                  {t("cms.unpublish")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    editor.mutations.publishPage.mutate(page.id, {
                      onSuccess: () =>
                        toast.success(t("cms.toastPagePublished")),
                      onError: () =>
                        toast.error(t("cms.toastPagePublishFailed")),
                    })
                  }
                >
                  {t("cms.publish")}
                </Button>
              )}
              <Button size="sm" disabled={saving} onClick={saveAll}>
                {saving && <Spinner className="size-4" />}
                {t("cms.save")}
              </Button>
            </>
          ) : null}
        </div>
      }
    >
      {/* 三栏各自滚：页面不整体滚动，预览区吃满剩余高度 */}
      <div className="-mx-1 grid gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[240px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)]">
        <SectionTree
          sections={editor.sections}
          header={editor.header}
          footer={editor.footer}
          selectedSectionId={editor.selectedSectionId}
          selectedBlockId={editor.selectedBlockId}
          metaSelected={editor.metaSelected}
          canWrite={canWrite}
          onSelect={(sectionId, blockId) =>
            editor.selectSection(sectionId, blockId)
          }
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

        <div className="flex h-[70vh] flex-col overflow-hidden rounded-lg border bg-background lg:h-full">
          <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
            <span className="truncate">
              {t("editor.preview")} · {editor.path}
            </span>
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
            highlightSectionId={editor.selectedSectionId}
          >
            <TenantSiteView
              embedded
              site={editor.previewSite}
              path={editor.path}
              sections={editor.previewSections}
              alternates={editor.previewAlternates}
              pageSettings={editor.pageSettings}
              headerOverride={editor.header}
              footerOverride={editor.footer}
              onSelectSection={(sectionId) => editor.selectSection(sectionId)}
            />
          </PreviewFrame>
        </div>

        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
          {editor.metaSelected ? (
            <PageMetaForm
              title={editor.title}
              description={editor.description}
              path={editor.path}
              settings={editor.pageSettings}
              disabled={!canWrite}
              onChangeTitle={editor.setTitle}
              onChangeDescription={editor.setDescription}
              onChangeSettings={editor.setPageSettings}
            />
          ) : selectedSection ? (
            <SectionSettingsForm
              section={selectedSection}
              blockId={editor.selectedBlockId}
              disabled={!canWrite}
              locale={editor.locale}
              defaultLocale={editor.defaultLocale}
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
  );
}
