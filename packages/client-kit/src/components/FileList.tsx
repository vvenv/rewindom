import { useEffect, useRef, useState, type ReactElement } from "react";

import { Button } from "@rewindom/ui/button";
import { cn } from "@rewindom/ui/utils";
import { FileIcon, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatFileSize } from "../lib/file-drop.js";

/**
 * 给待上传的图片生成一次性预览地址，卸载 / 换文件时回收。
 *
 * 不回收的话每选一次文件就漏一块 blob，抽屉开开关关几轮就攒出几十 MB。
 */
function useFilePreviews(files: readonly File[]): (string | null)[] {
  const [urls, setUrls] = useState<(string | null)[]>([]);
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  });

  // 按内容签名重建，而不是按数组身份：父组件每次渲染都可能给一个新数组，
  // 那样会把预览地址反复建了又撤，缩略图跟着闪。
  const signature = files
    .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
    .join("|");

  useEffect(() => {
    const created = filesRef.current.map((file) =>
      file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    );
    setUrls(created);
    return () => {
      for (const url of created) {
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, [signature]);

  return urls;
}

export interface FileListProps {
  files: readonly File[];
  /** 省略则不显示移除按钮（用于纯展示的已上传列表）。 */
  onRemove?: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 已选文件清单：缩略图 / 图标 + 文件名 + 体积 + 移除。
 *
 * 与 `FileDropZone` 配套——选完文件却看不见选了什么，是裸 `<input type="file">` 最气人
 * 的一点（它只告诉你「已选择 3 个文件」）。
 */
export function FileList({
  files,
  onRemove,
  disabled = false,
  className,
}: FileListProps): ReactElement | null {
  const { t } = useTranslation("common");
  const previews = useFilePreviews(files);

  if (files.length === 0) return null;

  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {files.map((file, index) => (
        <li
          key={`${file.name}-${file.size}-${index}`}
          className="flex items-center gap-2 rounded-lg border border-border/60 p-1.5"
        >
          {previews[index] ? (
            <img
              src={previews[index]!}
              alt=""
              className="size-9 shrink-0 rounded-md bg-muted object-cover"
            />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <FileIcon className="size-4 text-muted-foreground" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">{file.name}</span>
            <span className="block text-xs text-muted-foreground tabular-nums">
              {formatFileSize(file.size)}
            </span>
          </span>
          {onRemove ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={disabled}
              aria-label={t("fileDrop.remove", { name: file.name })}
              onClick={() => onRemove(index)}
            >
              <X />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
