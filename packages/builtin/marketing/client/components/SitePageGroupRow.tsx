import { type ReactNode } from "react";

import { getLocaleNativeLabel, type AppLocale } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { Spinner } from "@be-water/ui/spinner";
import { cn } from "@be-water/ui/utils";
import { CloudOff, CloudUpload, Copy, Palette, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { SitePageDuplicateSheet } from "./SitePageDuplicateSheet.js";
import { SitePublishStatus } from "./SitePublishStatus.js";

import type {
  MarketingPageKind,
  MarketingPageListItem,
} from "../../shared/site-cms.js";
import type { SitePageActions } from "../hooks/use-site-page-actions.js";
import type { SitePageGroup } from "../lib/site-page-groups.js";

interface SitePageGroupRowProps {
  group: SitePageGroup;
  defaultLocale: AppLocale;
  canWrite: boolean;
  actions: SitePageActions;
}

const KIND_LABEL_KEY = {
  home: "cms.kindHome",
  page: "cms.kindPage",
  doc_index: "cms.kindDocIndex",
  doc_article: "cms.kindDocArticle",
} as const satisfies Record<MarketingPageKind, string>;

/**
 * 翻译组一块：一个逻辑 URL 下的各语言页面。
 *
 * 只有一种语言时（单语言站点的常态）标题与那一行合并——原来固定「组头 + 语言行」
 * 两行，第二行只写着「简体中文 草稿」，一页白占一倍高度。多语言时才展开成
 * 组头 + 缩进的语言行；两种形态共用 `PageRow`，右侧状态与操作列因此始终对齐。
 */
export function SitePageGroupRow({
  group,
  defaultLocale,
  canWrite,
  actions,
}: SitePageGroupRowProps) {
  const { t } = useTranslation("marketing");
  const primary =
    group.pages.find((page) => page.locale === defaultLocale) ??
    group.pages[0]!;

  const heading = (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {canWrite ? (
        <Link
          to={`/app/site/pages/${primary.id}`}
          className="truncate font-medium hover:underline"
        >
          {group.title}
        </Link>
      ) : (
        <span className="truncate font-medium">{group.title}</span>
      )}
      <span className="text-xs text-muted-foreground">
        {t(KIND_LABEL_KEY[group.kind])}
      </span>
      <span className="truncate font-mono text-xs text-muted-foreground">
        {group.path}
      </span>
    </div>
  );

  if (group.pages.length === 1) {
    return (
      <PageRow page={primary} canWrite={canWrite} actions={actions}>
        {heading}
      </PageRow>
    );
  }

  return (
    <div className="py-1">
      <div className="px-4 py-2">{heading}</div>
      <ul className="flex flex-col">
        {group.pages.map((page) => (
          <li key={page.id}>
            <PageRow page={page} canWrite={canWrite} actions={actions} indent>
              <span className="truncate text-sm">
                {getLocaleNativeLabel(page.locale)}
              </span>
            </PageRow>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 一个页面（= 一个语言版本）占一行：左边是标识，右边是状态与操作。
 * `indent` 用于多语言组里的语言行，靠一条竖线挂在组头下面。
 */
function PageRow({
  page,
  canWrite,
  actions,
  indent,
  children,
}: {
  page: MarketingPageListItem;
  canWrite: boolean;
  actions: SitePageActions;
  indent?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-muted/40",
        indent && "ml-6 border-l py-1.5 pl-4",
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 items-center gap-1">
        {/* 窄屏只留状态点，文案挤掉——图标化的操作按钮已经把行占满 */}
        <SitePublishStatus
          status={page.status}
          contentDirty={page.content_dirty}
          className="sm:w-32"
          labelClassName="sr-only sm:not-sr-only"
        />
        {canWrite ? <PageActions page={page} actions={actions} /> : null}
      </div>
    </div>
  );
}

function PageActions({
  page,
  actions,
}: {
  page: MarketingPageListItem;
  actions: SitePageActions;
}) {
  const { t } = useTranslation("marketing");
  const isPublished = page.status === "published";
  const publishPending =
    actions.publishPendingId === page.id ||
    actions.unpublishPendingId === page.id;
  const deletePending = actions.deletePendingId === page.id;

  return (
    <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
      <Button
        asChild
        variant="ghost"
        size="icon-sm"
        title={t("editor.open")}
        aria-label={t("editor.open")}
      >
        <Link to={`/app/site/pages/${page.id}`}>
          <Palette className="size-3.5" />
        </Link>
      </Button>
      <SitePageDuplicateSheet page={page}>
        <Button
          variant="ghost"
          size="icon-sm"
          title={t("cms.duplicate")}
          aria-label={t("cms.duplicate")}
        >
          <Copy className="size-3.5" />
        </Button>
      </SitePageDuplicateSheet>
      <Button
        variant="ghost"
        size="icon-sm"
        title={t(isPublished ? "cms.unpublish" : "cms.publish")}
        aria-label={t(isPublished ? "cms.unpublish" : "cms.publish")}
        disabled={publishPending}
        onClick={() => actions.togglePublish(page)}
      >
        {publishPending ? (
          <Spinner className="size-3.5" />
        ) : isPublished ? (
          <CloudOff className="size-3.5" />
        ) : (
          <CloudUpload className="size-3.5" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="hover:text-destructive"
        title={t("cms.delete")}
        aria-label={t("cms.delete")}
        disabled={deletePending}
        onClick={() => void actions.remove(page.id, page.title)}
      >
        {deletePending ? (
          <Spinner className="size-3.5" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
