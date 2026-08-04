import { useEffect, useRef } from "react";

import { PageLayout, usePermissions } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Spinner } from "@be-water/ui/spinner";
import { ArrowLeft, Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

import { TenantSiteView } from "../components/TenantSiteView.js";
import { PresetMenu } from "../components/theme-editor/PresetMenu.js";
import { SectionSettingsForm } from "../components/theme-editor/SectionSettingsForm.js";
import { SectionTree } from "../components/theme-editor/SectionTree.js";
import { useSiteThemeEditor } from "../hooks/use-site-theme-editor.js";

export function SiteThemeEditor() {
  const { pageId } = useParams<{ pageId: string }>();
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const editor = useSiteThemeEditor(pageId);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const { selectedSectionId } = editor;
  const headerId = editor.header?.id ?? null;

  // 左侧树选中后把预览滚到对应区块；页头是 sticky，scrollIntoView 会判定
  // 「已在视口内」而不动，所以单独滚到顶部。
  useEffect(() => {
    const container = previewRef.current;
    if (!container || !selectedSectionId) return;
    if (selectedSectionId === headerId) {
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    container
      .querySelector(`[data-section-id="${CSS.escape(selectedSectionId)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedSectionId, headerId]);

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
  const saving =
    editor.mutations.updatePage.isPending ||
    editor.mutations.updateSite.isPending;

  /** 页面 sections 与站点级页头页脚分属两个资源，一次保存两边都写。 */
  const saveAll = (): void => {
    if (!pageId || !editor.header || !editor.footer) return;
    editor.mutations.updatePage.mutate(
      {
        pageId,
        body: {
          title: editor.title.trim(),
          description: editor.description.trim(),
          sections: editor.sections,
        },
      },
      {
        onSuccess: () => {
          editor.mutations.updateSite.mutate(
            { header: editor.header!, footer: editor.footer! },
            {
              onSuccess: () => toast.success(t("editor.toastSaved")),
              onError: () => toast.error(t("cms.toastSiteSaveFailed")),
            },
          );
        },
        onError: () => toast.error(t("cms.toastPageSaveFailed")),
      },
    );
  };

  return (
    <PageLayout
      icon={Palette}
      title={t("editor.title")}
      description={editor.title || page.title}
      fill
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to="/site">
              <ArrowLeft className="size-4" />
              <span className="hidden md:inline">{t("editor.back")}</span>
            </Link>
          </Button>
          {canWrite ? (
            <>
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
          selection={editor.selection}
          canWrite={canWrite}
          onSelect={(next) =>
            editor.selectSection(next.sectionId, next.blockId)
          }
          onAddSection={editor.addSection}
          onRemoveSection={editor.removeSection}
          onMoveSection={editor.moveSection}
          onAddBlock={editor.addBlock}
          onRemoveBlock={editor.removeBlock}
          onMoveBlock={editor.moveBlock}
          presetSlot={
            <PresetMenu
              hasContent={editor.sections.length > 0}
              onApply={editor.replaceSections}
            />
          }
        />

        <div className="flex h-[70vh] flex-col overflow-hidden rounded-lg border bg-background lg:h-full">
          <div className="shrink-0 border-b px-3 py-2 text-xs text-muted-foreground">
            {t("editor.preview")} · {editor.path}
          </div>
          <div ref={previewRef} className="min-h-0 flex-1 overflow-y-auto">
            <TenantSiteView
              embedded
              site={editor.previewSite}
              path={editor.path}
              sections={editor.sections}
              pageSettings={editor.page?.settings}
              title={editor.title}
              description={editor.description}
              headerOverride={editor.header ?? undefined}
              footerOverride={editor.footer ?? undefined}
              selectedSectionId={editor.selectedSectionId}
              onSelectSection={(sectionId) => editor.selectSection(sectionId)}
            />
          </div>
        </div>

        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
          {selectedSection ? (
            <SectionSettingsForm
              section={selectedSection}
              blockId={editor.selectedBlockId}
              disabled={!canWrite}
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
