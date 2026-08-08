import { PageLayout, usePermissions } from "@be-water/module-sdk/client";
import { DraggableFabTrigger } from "@be-water/ui/draggable-fab";
import { Bookmark as BookmarkIcon, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BookmarkCreateSheet } from "../components/BookmarkCreateSheet.js";

export function Bookmarks() {
  const { t } = useTranslation("example-external");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("example-external.write");

  return (
    <PageLayout
      icon={BookmarkIcon}
      title={t("title")}
      description={t("pageDescription")}
      action={
        canWrite ? (
          <BookmarkCreateSheet>
            <DraggableFabTrigger storageKey="example_external_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("create")}</span>
            </DraggableFabTrigger>
          </BookmarkCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <BookmarkIcon className="size-12 opacity-30" />
        <p className="text-sm">{t("empty")}</p>
        <p className="text-xs opacity-70">{t("emptyHint")}</p>
      </div>
    </PageLayout>
  );
}
