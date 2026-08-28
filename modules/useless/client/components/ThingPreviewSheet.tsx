import { useState, type ReactNode } from "react";

import { ApiError } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useThingPreview } from "../hooks/useThingPreview.js";

import type { ThingListItem } from "../../shared/index.js";

/**
 * 中台预览：把这个东西渲染成整张站点页面，装进 iframe 看。
 *
 * **这里的 iframe 是套沙箱的，线上不是。** 预览正是你评估一段还没审过的代码的
 * 地方——它不该有能力改你的管理界面。代价是行为不完全等同于线上（沙箱里
 * 拿不到父页面），但「长什么样、跑不跑得起来」这两件事看得准。
 */
export function ThingPreviewSheet({
  item,
  children,
}: {
  item: ThingListItem;
  children?: ReactNode;
}) {
  const { t } = useTranslation("useless");
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, error } = useThingPreview(item.id, open);

  const name = (item.kind === "embed" ? item.title : item.text) || "—";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button size="icon" variant="ghost" aria-label={t("previewAriaLabel")}>
            <Eye className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{t("previewTitle")}</SheetTitle>
          <SheetDescription>{t("previewDescription")}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 px-4 pb-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : isError || !data ? (
            <p className="text-destructive text-sm">
              {error instanceof ApiError ? error.message : t("previewFailed")}
            </p>
          ) : (
            <iframe
              className="bg-background h-full min-h-[32rem] w-full rounded-md border"
              /* 只给 allow-scripts：给了 allow-same-origin 等于没有沙箱 */
              sandbox="allow-scripts"
              srcDoc={data.html}
              title={name}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
