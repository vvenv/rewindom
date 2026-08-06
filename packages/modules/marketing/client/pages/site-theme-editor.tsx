import { useEffect, useState } from "react";

import { PageLayout, useConfirm, usePermissions } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { ButtonGroup } from "@be-water/ui/button-group";
import { Spinner } from "@be-water/ui/spinner";
import {
  ArrowLeft,
  Monitor,
  Palette,
  Smartphone,
  Tablet,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { TenantSiteView } from "../components/TenantSiteView.js";
import { EditorToolbar } from "../components/theme-editor/EditorToolbar.js";
import { PageMetaForm } from "../components/theme-editor/PageMetaForm.js";
import {
  PreviewFrame,
  type PreviewDevice,
} from "../components/theme-editor/PreviewFrame.js";
import { SectionSettingsForm } from "../components/theme-editor/SectionSettingsForm.js";
import { SectionTree } from "../components/theme-editor/SectionTree.js";
import { SiteAccountEntryPreview } from "../components/theme-editor/SiteAccountEntryPreview.js";
import {
  useSiteThemeEditor,
  clearEditorCache,
} from "../hooks/use-site-theme-editor.js";
import { resolveEditorPublishState } from "../lib/editor-publish-state.js";
import { siteMemberEntrySlot } from "../shell/site-member-slots.js";

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
  const publishingPage = editor.mutations.publishPage.isPending;
  const revertingContent = editor.mutations.revertPageContent.isPending;
  const revertingChrome = editor.mutations.revertChrome.isPending;
  const publishState = resolveEditorPublishState({
    dirty: editor.dirty,
    published: page.status === "published",
    contentDirty: editor.contentDirty,
  });

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
          visibility: editor.visibility,
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

  /**
   * 「发布」只有一枚：页面还没上线就走上线（服务端顺带把草稿提升到线上），
   * 已经上线就只推正文。两条路径对用户是同一件事——让线上等于当前草稿。
   */
  const publish = (): void => {
    if (!pageId) return;
    if (page.status === "published") {
      editor.mutations.publishPageContent.mutate(pageId, {
        onSuccess: () => toast.success(t("editor.toastContentPublished")),
        onError: () => toast.error(t("editor.toastContentPublishFailed")),
      });
      return;
    }
    editor.mutations.publishPage.mutate(pageId, {
      onSuccess: () => toast.success(t("cms.toastPagePublished")),
      onError: () => toast.error(t("cms.toastPagePublishFailed")),
    });
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
   * 撤销落在服务端：草稿列回灌成线上列后编辑器整个重新灌入，
   * 内存里没保存的改动也一并作废——所以有未保存改动时要在确认里多说一句。
   */
  const confirmRevert = async (titleKey: string, bodyKey: string) => {
    const body = t(bodyKey);
    return confirm({
      title: t(titleKey),
      description: editor.dirty
        ? `${body}${t("editor.revertDiscardsUnsavedToo")}`
        : body,
      confirmText: t("editor.revertConfirmAction"),
      destructive: true,
    });
  };

  /** 撤销本页未发布的更改：服务端把草稿列回灌成线上列。 */
  const revertContent = async (): Promise<void> => {
    if (!pageId) return;
    const confirmed = await confirmRevert(
      "editor.revertContentConfirmTitle",
      "editor.revertContentConfirmBody",
    );
    if (!confirmed) return;
    editor.mutations.revertPageContent.mutate(pageId, {
      onSuccess: () => {
        clearEditorCache(pageId);
        toast.success(t("editor.toastContentReverted"));
      },
      onError: () => toast.error(t("editor.toastRevertFailed")),
    });
  };

  /** 撤销页头页脚未发布的更改（站点级，影响所有页面）。 */
  const revertChrome = async (): Promise<void> => {
    const confirmed = await confirmRevert(
      "editor.revertChromeConfirmTitle",
      "editor.revertChromeConfirmBody",
    );
    if (!confirmed) return;
    editor.mutations.revertChrome.mutate(undefined, {
      onSuccess: () => {
        if (pageId) clearEditorCache(pageId);
        toast.success(t("editor.toastChromeReverted"));
      },
      onError: () => toast.error(t("editor.toastRevertFailed")),
    });
  };

  const unpublish = (): void => {
    editor.mutations.unpublishPage.mutate(page.id, {
      onSuccess: () => toast.success(t("cms.toastPageUnpublished")),
      onError: () => toast.error(t("cms.toastPagePublishFailed")),
    });
  };

  return (
    <PageLayout
      icon={Palette}
      title={t("editor.title")}
      description={editor.title || page.title}
      fill
      action={
        <EditorToolbar
          page={page}
          currentTitle={editor.title || page.title}
          localePages={editor.localePages}
          localeVariants={editor.localeVariants}
          locale={editor.locale}
          state={publishState}
          canWrite={canWrite}
          hasSections={editor.sections.length > 0}
          chromeDirty={editor.chromeDirty}
          pending={{
            saving,
            publishing: publishingContent || publishingPage,
            chrome: publishingChrome || revertingChrome,
            reverting: revertingContent,
          }}
          onBack={() => void leaveTo("/site")}
          onGoToPage={goToPage}
          onDuplicated={(created) => void navigate(`/site/pages/${created.id}`)}
          onApplyPreset={editor.replaceSections}
          onSave={saveAll}
          onPublish={publish}
          onUnpublish={unpublish}
          onPublishChrome={publishChrome}
          onDiscardLocal={() => void discardLocal()}
          onRevertContent={() => void revertContent()}
          onRevertChrome={() => void revertChrome()}
        />
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
            {/*
              页头的会员入口在站点前台由 site-member 填进 slot；编辑器在工作台
              外壳里拿不到那份 Provider，所以自己灌一个访客态的静态预览，
              让「账户入口」开关在预览里看得见效果。
            */}
            <siteMemberEntrySlot.Provider component={SiteAccountEntryPreview}>
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
            </siteMemberEntrySlot.Provider>
          </PreviewFrame>
        </div>

        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
          {editor.metaSelected ? (
            <PageMetaForm
              title={editor.title}
              description={editor.description}
              path={editor.path}
              settings={editor.pageSettings}
              visibility={editor.visibility}
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
