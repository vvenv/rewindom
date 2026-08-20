import { useState, type ReactElement, type ReactNode } from "react";

import { EmptyState, useConfirm } from "@rewindom/client-kit";
import { formatBusinessDate } from "@rewindom/shared";
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
import { toast } from "@rewindom/ui/toast";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  usePageVersions,
  useRestorePageVersion,
} from "../../hooks/usePageVersions.js";

/**
 * 版本历史面板：列出每次发布，可以把任意一版**恢复成草稿**。
 *
 * 恢复不直接覆盖线上（见服务端 `restorePageVersion`），所以这里的确认框说的是
 * 「会覆盖当前草稿」而不是「会改线上」——两者的心理成本差很远，说错会吓退租户。
 *
 * 列表只在面板打开后才拉：编辑器主界面不需要它。
 */
export function PageVersionsSheet({
  pageId,
  children,
}: {
  pageId: string | undefined;
  children?: ReactNode;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = usePageVersions(pageId, open);
  const restore = useRestorePageVersion(pageId);

  const handleRestore = async (version: number): Promise<void> => {
    const confirmed = await confirm({
      title: t("versions.restoreConfirmTitle", { version }),
      description: t("versions.restoreConfirmDescription"),
    });
    if (!confirmed) return;
    try {
      await restore.mutateAsync(version);
      toast.success(t("versions.restored"));
      setOpen(false);
    } catch {
      toast.error(t("versions.restoreFailed"));
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          /*
           * 只留图标：它挨着「保存草稿」站在工具栏上，带文字时两者一样重，而翻历史
           * 是全场用得最少的一件事。`title` 与 `aria-label` 补上名字，手机端悬浮条
           * 也省下一枚按钮的宽度。外形跟着导航段走（outline，与换页按钮等高）。
           */
          <Button
            variant="outline"
            size="icon-sm"
            title={t("versions.title")}
            aria-label={t("versions.title")}
          >
            <History className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("versions.title")}</SheetTitle>
          <SheetDescription>{t("versions.hint")}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-5" />
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <EmptyState
              size="panel"
              icon={History}
              title={t("versions.empty")}
              description={t("versions.emptyHint")}
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {data?.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      v{item.version} · {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBusinessDate(item.created_at)}
                      {item.created_by ? ` · ${item.created_by}` : ""}
                      {` · ${t("versions.sectionCount", { count: item.section_count })}`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={restore.isPending}
                    onClick={() => void handleRestore(item.version)}
                  >
                    {t("versions.restore")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
