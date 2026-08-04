import { getLocaleNativeLabel, type AppLocale } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  CloudOff,
  CloudUpload,
  Copy,
  Palette,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { SitePageDuplicateSheet } from "./SitePageDuplicateSheet.js";
import { SitePageEditSheet } from "./SitePageEditSheet.js";

import type {
  MarketingPageKind,
  MarketingPageListItem,
} from "../../shared/site-cms.js";
import type { SitePageGroup } from "../lib/site-page-groups.js";

interface SitePageGroupRowProps {
  group: SitePageGroup;
  defaultLocale: AppLocale;
  canWrite: boolean;
  publishPendingId: string | undefined;
  unpublishPendingId: string | undefined;
  deletePendingId: string | undefined;
  onTogglePublish: (page: MarketingPageListItem) => void;
  onDelete: (pageId: string, pageTitle: string) => void;
}

const KIND_LABEL_KEY = {
  home: "cms.kindHome",
  page: "cms.kindPage",
} as const satisfies Record<MarketingPageKind, string>;

/**
 * 翻译组一行：标题 + 逻辑路径作头，下面各语言各占一行（含操作）。
 * 单语言与多语言同一结构，避免两套布局。
 */
export function SitePageGroupRow({
  group,
  defaultLocale,
  canWrite,
  publishPendingId,
  unpublishPendingId,
  deletePendingId,
  onTogglePublish,
  onDelete,
}: SitePageGroupRowProps) {
  const { t } = useTranslation("marketing");
  const primary =
    group.pages.find((page) => page.locale === defaultLocale) ??
    group.pages[0]!;

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {canWrite ? (
          <Link
            to={`/site/pages/${primary.id}`}
            className="font-medium hover:underline"
          >
            {group.title}
          </Link>
        ) : (
          <span className="font-medium">{group.title}</span>
        )}
        <span className="text-xs text-muted-foreground">
          {t(KIND_LABEL_KEY[group.kind])}
        </span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {group.path}
        </span>
      </div>

      <ul className="flex flex-col">
        {group.pages.map((page) => (
          <li
            key={page.id}
            className="flex items-center justify-between gap-2 rounded-md py-1 pl-0.5 pr-0 sm:pl-1"
          >
            <div className="flex min-w-0 items-center gap-2">
              {canWrite ? (
                <Link
                  to={`/site/pages/${page.id}`}
                  className="text-sm hover:underline"
                >
                  {getLocaleNativeLabel(page.locale)}
                </Link>
              ) : (
                <span className="text-sm">
                  {getLocaleNativeLabel(page.locale)}
                </span>
              )}
              <span
                className={
                  page.status === "published"
                    ? "text-xs text-foreground/70"
                    : "text-xs text-muted-foreground"
                }
              >
                {page.status === "published"
                  ? t("cms.statusPublished")
                  : t("cms.statusDraft")}
              </span>
            </div>
            {canWrite ? (
              <PageActions
                page={page}
                publishPendingId={publishPendingId}
                unpublishPendingId={unpublishPendingId}
                deletePendingId={deletePendingId}
                onTogglePublish={onTogglePublish}
                onDelete={onDelete}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PageActions({
  page,
  publishPendingId,
  unpublishPendingId,
  deletePendingId,
  onTogglePublish,
  onDelete,
}: {
  page: MarketingPageListItem;
  publishPendingId: string | undefined;
  unpublishPendingId: string | undefined;
  deletePendingId: string | undefined;
  onTogglePublish: (page: MarketingPageListItem) => void;
  onDelete: (pageId: string, pageTitle: string) => void;
}) {
  const { t } = useTranslation("marketing");

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        asChild
        variant="ghost"
        size="icon-sm"
        title={t("editor.open")}
        aria-label={t("editor.open")}
      >
        <Link to={`/site/pages/${page.id}`}>
          <Palette className="size-3.5" />
        </Link>
      </Button>
      <SitePageEditSheet page={page}>
        <Button
          variant="ghost"
          size="icon-sm"
          title={t("cms.edit")}
          aria-label={t("cms.edit")}
        >
          <Pencil className="size-3.5" />
        </Button>
      </SitePageEditSheet>
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
        title={t(page.status === "published" ? "cms.unpublish" : "cms.publish")}
        aria-label={t(
          page.status === "published" ? "cms.unpublish" : "cms.publish",
        )}
        disabled={
          publishPendingId === page.id || unpublishPendingId === page.id
        }
        onClick={() => onTogglePublish(page)}
      >
        {page.status === "published" ? (
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
        disabled={deletePendingId === page.id}
        onClick={() => void onDelete(page.id, page.title)}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
