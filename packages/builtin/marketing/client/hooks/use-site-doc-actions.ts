import { useCallback } from "react";

import { ApiError, useConfirm } from "@be-water/client-kit";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";

import { downloadMarkdownFile } from "../lib/site-doc-list.js";

import {
  useDeleteSiteDoc,
  useExportSiteDoc,
  usePublishSiteDoc,
  useRevertSiteDoc,
  useUnpublishSiteDoc,
} from "./useSiteDocs.js";

import type { MarketingDocListItem } from "../../shared/marketing-doc.js";

/**
 * 文档列表的行内操作（发布 / 取消发布 / 撤销 / 导出 / 删除）。
 *
 * 整张表共用一份 mutation：之前每一行各自 `useDeleteSiteDoc()` 等五个 hook，
 * 一百行就是五百个订阅。挂起态按文档 id 暴露而不是布尔值——发起操作的那一行才该
 * 禁用，与 `useSitePageActions` 同口径。
 */
export interface SiteDocActions {
  togglePublish: (doc: MarketingDocListItem) => Promise<void>;
  revert: (doc: MarketingDocListItem) => Promise<void>;
  remove: (doc: MarketingDocListItem) => Promise<void>;
  exportOne: (doc: MarketingDocListItem) => Promise<void>;
  pendingId: string | undefined;
}

export function useSiteDocActions(): SiteDocActions {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();
  const publish = usePublishSiteDoc();
  const unpublish = useUnpublishSiteDoc();
  const revertDoc = useRevertSiteDoc();
  const removeDoc = useDeleteSiteDoc();
  const exportDoc = useExportSiteDoc();

  const togglePublish = useCallback(
    async (doc: MarketingDocListItem) => {
      const isPublished = doc.status === "published";
      const mutation = isPublished ? unpublish : publish;
      try {
        await mutation.mutateAsync(doc.id);
        toast.success(
          t(
            isPublished
              ? "siteDocs.unpublishedToast"
              : "siteDocs.publishedToast",
          ),
        );
      } catch (error) {
        toast.error(
          error instanceof ApiError
            ? error.message
            : t(
                isPublished
                  ? "siteDocs.unpublishFailed"
                  : "siteDocs.publishFailed",
              ),
        );
      }
    },
    [publish, unpublish, t],
  );

  const revert = useCallback(
    async (doc: MarketingDocListItem) => {
      const confirmed = await confirm({
        title: t("siteDocs.revertConfirmTitle"),
        description: t("siteDocs.revertConfirmDescription"),
        confirmText: t("siteDocs.revert"),
      });
      if (!confirmed) return;
      try {
        await revertDoc.mutateAsync(doc.id);
        toast.success(t("siteDocs.reverted"));
      } catch (error) {
        toast.error(
          error instanceof ApiError
            ? error.message
            : t("siteDocs.revertFailed"),
        );
      }
    },
    [confirm, revertDoc, t],
  );

  const remove = useCallback(
    async (doc: MarketingDocListItem) => {
      const confirmed = await confirm({
        title: t("siteDocs.deleteConfirmTitle"),
        description: t("siteDocs.deleteConfirmDescription", {
          title: doc.title,
        }),
        confirmText: t("siteDocs.delete"),
        destructive: true,
      });
      if (!confirmed) return;
      try {
        await removeDoc.mutateAsync(doc.id);
        toast.success(t("siteDocs.deleted"));
      } catch (error) {
        toast.error(
          error instanceof ApiError
            ? error.message
            : t("siteDocs.deleteFailed"),
        );
      }
    },
    [confirm, removeDoc, t],
  );

  const exportOne = useCallback(
    async (doc: MarketingDocListItem) => {
      try {
        const result = await exportDoc.mutateAsync(doc.id);
        downloadMarkdownFile(result.filename, result.markdown);
      } catch (error) {
        toast.error(
          error instanceof ApiError
            ? error.message
            : t("siteDocs.exportFailed"),
        );
      }
    },
    [exportDoc, t],
  );

  const pendingMutation = [
    publish,
    unpublish,
    revertDoc,
    removeDoc,
    exportDoc,
  ].find((mutation) => mutation.isPending);

  return {
    togglePublish,
    revert,
    remove,
    exportOne,
    pendingId: pendingMutation?.variables,
  };
}
