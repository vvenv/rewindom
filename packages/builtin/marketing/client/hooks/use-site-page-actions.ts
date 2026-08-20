import { useConfirm } from "@rewindom/client-kit";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  DEFAULT_HOME_LAYOUT_KEY,
  getHomeLayout,
} from "../../shared/home-layouts.js";
import {
  canSetPageAsHome,
  homeLayoutReplacingPath,
} from "../../shared/site-home.js";
import { moveSitePageGroup } from "../lib/site-page-order.js";

import { useSite, useSiteCapabilities, useSiteMutations } from "./useSite.js";

import type { MarketingPageListItem } from "../../shared/site-cms.js";
import type { SitePageGroup } from "../lib/site-page-groups.js";

/**
 * 页面列表的行内操作（发布 / 取消发布 / 删除 / 调整顺序）。
 *
 * 挂起态按页面 id 暴露而不是布尔值：同一份 mutation 服务整张列表，只有发起的
 * 那一行该禁用。顺序是整张表的属性，所以那一项是布尔值。
 */
export interface SitePageActions {
  publishPendingId: string | undefined;
  unpublishPendingId: string | undefined;
  deletePendingId: string | undefined;
  resetPresetPendingId: string | undefined;
  reorderPending: boolean;
  togglePublish: (page: MarketingPageListItem) => void;
  remove: (pageId: string, pageTitle: string) => Promise<void>;
  /** 重设为最新版式（智能合并保留内容，只写草稿）；仅对有内置版式的页面可用。 */
  resetPreset: (page: MarketingPageListItem) => Promise<void>;
  /** 把一张还没落库的模板页版式建出来（首页、会员那几张平时不预建的）。 */
  initializeTemplate: (kind: string) => void;
  initializeTemplatePendingKind: string | undefined;
  /** 套用一套首页版式（确认后立刻 POST；会落库首页草稿）。 */
  applyHomeLayout: (key: string) => void;
  applyHomeLayoutPendingKey: string | undefined;
  /** 把第 `index` 个翻译组上移（-1）/ 下移（+1）。 */
  move: (
    groups: readonly SitePageGroup[],
    index: number,
    direction: -1 | 1,
  ) => void;
  /** 当前占据 `/` 的逻辑路径。 */
  homePath: string;
  homeLayoutKey: string;
  entitlements: ReadonlySet<string>;
  setHome: (path: string) => void;
  setHomePending: boolean;
}

export function useSitePageActions(): SitePageActions {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();
  const { data: site } = useSite();
  const capabilitiesQuery = useSiteCapabilities();
  const entitlements = new Set(capabilitiesQuery.data?.entitlements ?? []);
  const {
    removePage,
    publishDraft,
    unpublishPage,
    reorderPages,
    resetPagePreset,
    initializeTemplatePage,
    updateSite,
    applyHomeLayout,
  } = useSiteMutations();

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

  /**
   * 重设为最新版式：结构会变，先过统一确认弹窗说清楚「内容尽量保留、只写草稿」，
   * 确认后才动手——满意再发布，不满意撤销更改即可回退。
   */
  const resetPreset = async (page: MarketingPageListItem): Promise<void> => {
    const confirmed = await confirm({
      title: t("cms.resetPresetConfirmTitle"),
      description: t("cms.resetPresetConfirmDescription", {
        title: page.title,
      }),
      confirmText: t("cms.resetPreset"),
    });
    if (!confirmed) return;
    resetPagePreset.mutate(page.id, {
      onSuccess: () => toast.success(t("cms.toastPageResetToPreset")),
      onError: () => toast.error(t("cms.toastPageResetToPresetFailed")),
    });
  };

  /**
   * 初始化一张模板页的版式。
   *
   * 不问确认：这一步只是把内置版式建成一条可编辑的记录，访客看到的东西不变
   * （没落库时 SSR 本来就按同一套预设兜底），也没有什么可覆盖的。
   */
  const initializeTemplate = (kind: string): void => {
    initializeTemplatePage.mutate(kind, {
      onSuccess: () => toast.success(t("cms.toastTemplatePageInitialized")),
      onError: () => toast.error(t("cms.toastTemplatePageInitializeFailed")),
    });
  };

  /** 发布 / 取消发布共用同一份 toast 逻辑，按当前状态切换 mutation 与文案。 */
  const togglePublish = (page: MarketingPageListItem): void => {
    const isPublished = page.status === "published";
    const mutation = isPublished ? unpublishPage : publishDraft;
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

  /**
   * 调整顺序：只在失败时给 toast。
   *
   * 成功与否列表自己就说清楚了（那一行动了），每点一次弹一条只会把连点几下的人淹掉。
   */
  const move = (
    groups: readonly SitePageGroup[],
    index: number,
    direction: -1 | 1,
  ): void => {
    const items = moveSitePageGroup(groups, index, direction);
    if (items.length === 0) return;
    reorderPages.mutate(
      { items },
      { onError: () => toast.error(t("cms.toastPageReorderFailed")) },
    );
  };

  const applyLayout = (key: string): void => {
    void (async () => {
      const layout = getHomeLayout(key);
      if (!layout) return;
      const confirmed = await confirm({
        title: t("cms.applyHomeLayoutConfirmTitle", {
          label: t(layout.label),
        }),
        description: t("cms.applyHomeLayoutConfirmDescription"),
        confirmText: t("cms.applyHomeLayout"),
      });
      if (!confirmed) return;
      applyHomeLayout.mutate(key, {
        onSuccess: () => toast.success(t("cms.toastHomeLayoutApplied")),
        onError: () => toast.error(t("cms.toastHomeLayoutApplyFailed")),
      });
    })();
  };

  const setHome = (path: string): void => {
    const layout = homeLayoutReplacingPath(path, entitlements);
    if (layout) {
      if (
        !canSetPageAsHome({
          pagePath: path,
          homePath: site?.home_path || "/",
          homeLayoutKey: site?.home_layout_key || DEFAULT_HOME_LAYOUT_KEY,
          entitlements,
        })
      ) {
        return;
      }
      applyLayout(layout.key);
      return;
    }
    if (path === (site?.home_path || "/")) return;
    updateSite.mutate(
      { home_path: path },
      {
        onSuccess: () => toast.success(t("cms.toastHomeUpdated")),
        onError: () => toast.error(t("cms.toastSiteSaveFailed")),
      },
    );
  };

  return {
    publishPendingId: publishDraft.isPending
      ? publishDraft.variables
      : undefined,
    unpublishPendingId: unpublishPage.isPending
      ? unpublishPage.variables
      : undefined,
    deletePendingId: removePage.isPending ? removePage.variables : undefined,
    resetPresetPendingId: resetPagePreset.isPending
      ? resetPagePreset.variables
      : undefined,
    reorderPending: reorderPages.isPending,
    togglePublish,
    remove,
    resetPreset,
    initializeTemplate,
    initializeTemplatePendingKind: initializeTemplatePage.isPending
      ? initializeTemplatePage.variables
      : undefined,
    applyHomeLayout: applyLayout,
    applyHomeLayoutPendingKey: applyHomeLayout.isPending
      ? applyHomeLayout.variables
      : undefined,
    move,
    homePath: site?.home_path || "/",
    homeLayoutKey: site?.home_layout_key || DEFAULT_HOME_LAYOUT_KEY,
    entitlements,
    setHome,
    setHomePending: updateSite.isPending || applyHomeLayout.isPending,
  };
}
