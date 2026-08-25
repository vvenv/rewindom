import { type ReactElement, type ReactNode } from "react";

import { toast } from "@rewindom/ui/toast";
import { cn } from "@rewindom/ui/utils";
import { useTranslation } from "react-i18next";

import { useFileDrop, type FilePasteScope } from "../hooks/useFileDrop.js";

export interface FileDropAreaProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** 上传进行中：overlay 文案换成「上传中…」。 */
  pending?: boolean;
  /** overlay 上的文案，默认「松开即可上传」。 */
  label?: string;
  paste?: FilePasteScope;
  className?: string;
  children: ReactNode;
}

/**
 * 给一块已有内容（列表、卡片墙、表格）加上「拖文件进来就上传」。
 *
 * 与 `FileDropZone` 的分工：这个不占版面、平时完全看不见，用于「页面里已经有东西了，
 * 顺手拖一个进来」；`FileDropZone` 是表单里那块要人主动去点的框。
 */
export function FileDropArea({
  onFiles,
  accept,
  multiple = true,
  disabled = false,
  pending = false,
  label,
  paste = "window",
  className,
  children,
}: FileDropAreaProps): ReactElement {
  const { t } = useTranslation("common");

  const { dragging, dropProps } = useFileDrop({
    onFiles,
    accept,
    multiple,
    disabled,
    paste,
    onRejected: (rejected) => {
      toast.error(t("fileDrop.unsupported", { count: rejected.length }));
    },
  });

  return (
    <div className={cn("relative", className)} {...dropProps}>
      {children}
      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex min-h-32 items-center justify-center rounded-lg border-2 border-dashed border-primary bg-background/80 text-sm font-medium text-foreground backdrop-blur-sm">
          {pending
            ? t("fileDrop.uploading")
            : (label ?? t("fileDrop.dropHere"))}
        </div>
      ) : null}
    </div>
  );
}
