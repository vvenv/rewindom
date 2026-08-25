import { type ReactElement } from "react";

import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { cn } from "@rewindom/ui/utils";
import { UploadCloud } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useFileDrop, type FilePasteScope } from "../hooks/useFileDrop.js";
import { summarizeAccept } from "../lib/file-drop.js";

export interface FileDropZoneProps {
  onFiles: (files: File[]) => void;
  /** 与 `<input accept>` 同一个字符串；点选 / 拖放 / 粘贴共用它判定。 */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** 上传进行中：整块变成「上传中…」并挡住再次点击。 */
  pending?: boolean;
  /** 默认按 `multiple` 取「选择文件 / 选择一个文件」。 */
  label?: string;
  /** 默认由 `accept` 推出格式清单；传空串可以彻底不显示第二行。 */
  description?: string;
  paste?: FilePasteScope;
  className?: string;
  id?: string;
}

/**
 * 全站统一的「投放区」：点一下选文件、拖进来、或者直接 Ctrl+V。
 *
 * 凡是要上传文件的地方都该用它，不要再摆裸 `<input type="file">`——那玩意在不同系统上
 * 长得都不一样，也拖不进、粘不了，还没法显示格式与进度。
 *
 * 外壳是个 `<button>`：键盘 Enter / Space 打开文件框、焦点环、禁用态全都免费拿到。
 */
export function FileDropZone({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  pending = false,
  label,
  description,
  paste = "window",
  className,
  id,
}: FileDropZoneProps): ReactElement {
  const { t } = useTranslation("common");
  const blocked = disabled || pending;

  const { dragging, dropProps, openPicker, inputProps } = useFileDrop({
    onFiles,
    accept,
    multiple,
    disabled: blocked,
    paste,
    onRejected: (rejected) => {
      toast.error(t("fileDrop.unsupported", { count: rejected.length }));
    },
  });

  const acceptSummary = summarizeAccept(accept);
  const hint =
    description ??
    [
      t("fileDrop.hint"),
      acceptSummary && t("fileDrop.accepts", { list: acceptSummary }),
    ]
      .filter(Boolean)
      .join(" · ");

  const heading = pending
    ? t("fileDrop.uploading")
    : dragging
      ? t("fileDrop.dropHere")
      : (label ?? (multiple ? t("fileDrop.choose") : t("fileDrop.chooseOne")));

  return (
    <div className={cn("w-full", className)} {...dropProps}>
      <button
        type="button"
        id={id}
        disabled={blocked}
        aria-busy={pending}
        onClick={openPicker}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-input px-4 py-6 text-center transition-colors outline-none",
          "hover:border-ring/60 hover:bg-muted/40",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:opacity-60",
          dragging && "border-primary bg-primary/5",
        )}
      >
        {pending ? (
          <Spinner className="size-5 text-muted-foreground" />
        ) : (
          <UploadCloud
            className={cn(
              "size-5 shrink-0",
              dragging ? "text-primary" : "text-muted-foreground",
            )}
          />
        )}
        <span className="min-w-0">
          <span className="block text-sm font-medium">{heading}</span>
          {hint && !dragging && !pending ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {hint}
            </span>
          ) : null}
        </span>
      </button>
      <input {...inputProps} />
    </div>
  );
}
