import {
  cloneElement,
  isValidElement,
  type MouseEvent,
  type ReactElement,
} from "react";

import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

import { useFileDrop } from "../hooks/useFileDrop.js";

export interface FilePickerTriggerProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** 任意按钮 / FAB 当触发器；点它就开系统文件框。 */
  children: ReactElement<{
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    disabled?: boolean;
  }>;
}

/**
 * 把任意元素变成「选文件」按钮：隐藏 input 由它自己管，调用方只拿到 `onFiles`。
 *
 * 已经有现成按钮（工具栏、FAB、卡片上的图标钮）时用它；表单里需要一块可见的投放区用
 * `FileDropZone`。两边共用 `useFileDrop`，`accept` 判定与去重逻辑只有一份。
 */
export function FilePickerTrigger({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  children,
}: FilePickerTriggerProps): ReactElement {
  const { t } = useTranslation("common");

  const { openPicker, inputProps } = useFileDrop({
    onFiles,
    accept,
    multiple,
    disabled,
    onRejected: (rejected) => {
      toast.error(t("fileDrop.unsupported", { count: rejected.length }));
    },
  });

  return (
    <>
      {isValidElement(children)
        ? cloneElement(children, {
            disabled: disabled || children.props.disabled,
            onClick: (event: MouseEvent<HTMLElement>) => {
              children.props.onClick?.(event);
              if (!event.defaultPrevented) openPicker();
            },
          })
        : children}
      <input {...inputProps} />
    </>
  );
}
