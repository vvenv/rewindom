import { formatBusinessDateOrTimeAgo } from "@be-water/module-sdk/client";
import { Button } from "@be-water/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@be-water/ui/card";
import { cn } from "@be-water/ui/utils";
import { Check, Clock, Copy, ExternalLink, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCopyBookmarkLink } from "../hooks/useCopyBookmarkLink.js";

import { BookmarkEditSheet } from "./BookmarkEditSheet.js";

import type { BookmarkListItem } from "../../shared/index.js";

interface BookmarkCardProps {
  bookmark: BookmarkListItem;
  canWrite: boolean;
  isDeleting: boolean;
  onDelete: (bookmark: BookmarkListItem) => void;
}

export function BookmarkCard({
  bookmark,
  canWrite,
  isDeleting,
  onDelete,
}: BookmarkCardProps) {
  const { t } = useTranslation("bookmark");
  const { copied, copy } = useCopyBookmarkLink();

  return (
    <Card
      aria-busy={isDeleting}
      className={cn(
        "h-full transition-opacity",
        isDeleting && "pointer-events-none opacity-60",
      )}
    >
      <CardHeader>
        <CardTitle className="min-w-0">
          {/* 标题即入口：整条标题可点，不必再找一个「打开」链接 */}
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            title={bookmark.url}
            className="line-clamp-2 wrap-break-word hover:underline"
          >
            {bookmark.title}
          </a>
        </CardTitle>
        <CardAction className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label={copied ? t("copied") : t("copyLink")}
            title={copied ? t("copied") : t("copyLink")}
            onClick={() => void copy(bookmark.url)}
          >
            {copied ? (
              <Check className="size-4 text-primary" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
          {canWrite ? (
            <>
              <BookmarkEditSheet bookmark={bookmark} />
              <Button
                size="icon"
                variant="ghost"
                aria-label={t("deleteAriaLabel")}
                disabled={isDeleting}
                onClick={() => onDelete(bookmark)}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        <span className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="size-3 shrink-0" />
          <span className="truncate">{bookmark.host || bookmark.url}</span>
        </span>
        <p className="line-clamp-3 wrap-break-word text-muted-foreground">
          {bookmark.description_preview || t("emptyPreview")}
        </p>
      </CardContent>
      <CardFooter className="gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        {t("updatedAt", {
          time: formatBusinessDateOrTimeAgo(bookmark.updated_at),
        })}
      </CardFooter>
    </Card>
  );
}
