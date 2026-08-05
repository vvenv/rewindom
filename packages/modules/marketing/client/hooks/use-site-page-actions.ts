import { useConfirm } from "@be-water/client-kit";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSiteMutations } from "./useSite.js";

import type { MarketingPageListItem } from "../../shared/site-cms.js";

/**
 * 页面列表的行内操作（发布 / 取消发布 / 删除）。
 *
 * 挂起态按页面 id 暴露而不是布尔值：同一份 mutation 服务整张列表，只有发起的
 * 那一行该禁用。
 */
export interface SitePageActions {
  publishPendingId: string | undefined;
  unpublishPendingId: string | undefined;
  deletePendingId: string | undefined;
  togglePublish: (page: MarketingPageListItem) => void;
  remove: (pageId: string, pageTitle: string) => Promise<void>;
}

export function useSitePageActions(): SitePageActions {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();
  const { removePage, publishPage, unpublishPage } = useSiteMutations();

  /** 删除走统一的二次确认弹窗（`ConfirmProvider`），不用浏览器原生 confirm。 */
  const remove = async (pageId: string, pageTitle: string): Promise<void> => {
    const confirmed = await confirm({
      title: t("cms.deleteConfirmTitle"),
      description: t("cms.deleteConfirmDescription", { title: pageTitle }),
      confirmText: t("cms.delete"),
      destructive: true,
    });
    if (!confirmed) return;
    removePage.mutate(pageId, {
      onSuccess: () => toast.success(t("cms.toastPageDeleted")),
      onError: () => toast.error(t("cms.toastPageDeleteFailed")),
    });
  };

  /** 发布 / 取消发布共用同一份 toast 逻辑，按当前状态切换 mutation 与文案。 */
  const togglePublish = (page: MarketingPageListItem): void => {
    const isPublished = page.status === "published";
    const mutation = isPublished ? unpublishPage : publishPage;
    mutation.mutate(page.id, {
      onSuccess: () =>
        toast.success(
          t(
            isPublished ? "cms.toastPageUnpublished" : "cms.toastPagePublished",
          ),
        ),
      onError: () => toast.error(t("cms.toastPagePublishFailed")),
    });
  };

  return {
    publishPendingId: publishPage.isPending ? publishPage.variables : undefined,
    unpublishPendingId: unpublishPage.isPending
      ? unpublishPage.variables
      : undefined,
    deletePendingId: removePage.isPending ? removePage.variables : undefined,
    togglePublish,
    remove,
  };
}
