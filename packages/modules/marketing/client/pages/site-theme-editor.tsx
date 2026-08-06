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
          <Link to="/app/site">
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
  const publishing = editor.mutations.publishDraft.isPending;
  const reverting = editor.mutations.revertDraft.isPending;
  const publishState = resolveEditorPublishState({
    dirty: editor.dirty,
    published: page.status === "published",
    contentDirty: editor.contentDirty,
    // 页头页脚与正文同属一条发布链：只改页头也要算「有未发布的更改」，
    // 否则状态点会报「线上已是最新」，而访客看到的还是旧页头
    chromeDirty: editor.chromeDirty,
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
    void leaveTo(`/app/site/pages/${nextPageId}`);
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

  /**
   * 「发布」只有一枚：把这次编辑的东西整个上线——本页正文与站点级的页头页脚
   * 一起（服务端同一事务）；页面还没上线的话顺带上线。对用户就是一件事：
   * 让访客看到的等于眼前这一版。
   */
  const publish = (): void => {
    if (!pageId) return;
    editor.mutations.publishDraft.mutate(pageId, {
      onSuccess: () => toast.success(t("editor.toastPublished")),
      onError: () => toast.error(t("editor.toastPublishFailed")),
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
   * 撤销未发布的更改：正文与页头页脚的草稿一起回到线上那一版（同一事务）。
   * 页面重新灌入时会跟着回退，内存里没保存的改动一并作废——所以要连着问。
   */
  const revert = async (): Promise<void> => {
    if (!pageId) return;
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
    editor.mutations.revertDraft.mutate(pageId, {
      onSuccess: () => {
        clearEditorCache(pageId);
        toast.success(t("editor.toastReverted"));
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
          pending={{ saving, publishing, reverting }}
          onBack={() => void leaveTo("/app/site")}
          onGoToPage={goToPage}
          onDuplicated={(created) =>
            void navigate(`/app/site/pages/${created.id}`)
          }
          onApplyPreset={editor.replaceSections}
          onSave={saveAll}
          onPublish={publish}
          onUnpublish={unpublish}
          onDiscardLocal={() => void discardLocal()}
          onRevert={() => void revert()}
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
