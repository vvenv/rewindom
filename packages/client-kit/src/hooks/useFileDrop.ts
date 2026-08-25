import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type RefObject,
} from "react";

import {
  clipboardHasText,
  filesFromClipboard,
  filesFromDataTransfer,
  isFileDrag,
  partitionByAccept,
} from "../lib/file-drop.js";

/**
 * 粘贴范围：
 * - `window`：整个页面按 Ctrl+V 就上传（截图直传）。同时挂着多个时**只有最后挂载的那个**
 *   接管——弹层 / 抽屉是后挂的，天然压在页面那层上面，关掉又自动还给页面。
 * - `none`：不接粘贴。
 */
export type FilePasteScope = "window" | "none";

type PasteHandler = (event: ClipboardEvent) => void;

/** 后进先出：栈顶 = 当前视觉上最靠前的那个投放区。 */
const pasteHandlers: PasteHandler[] = [];

function dispatchPaste(event: ClipboardEvent): void {
  pasteHandlers[pasteHandlers.length - 1]?.(event);
}

function registerPasteHandler(handler: PasteHandler): () => void {
  if (pasteHandlers.length === 0) {
    document.addEventListener("paste", dispatchPaste);
  }
  pasteHandlers.push(handler);
  return () => {
    const index = pasteHandlers.lastIndexOf(handler);
    if (index >= 0) pasteHandlers.splice(index, 1);
    if (pasteHandlers.length === 0) {
      document.removeEventListener("paste", dispatchPaste);
    }
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export interface UseFileDropOptions {
  /** 通过了 `accept` 的文件；`multiple` 为 false 时只会给一个。 */
  onFiles: (files: File[]) => void;
  /** 与 `<input accept>` 同一个字符串，点选 / 拖放 / 粘贴共用。 */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  paste?: FilePasteScope;
  /** 被 `accept` 挡下的文件；用来提示「有 N 个格式不支持」。 */
  onRejected?: (files: File[]) => void;
}

export interface FileDropBinding {
  /** 有文件正悬在投放区上方——用来显示 overlay / 高亮边框。 */
  dragging: boolean;
  /** 摊到投放区容器上。 */
  dropProps: {
    onDragEnter: (event: DragEvent<HTMLElement>) => void;
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDragLeave: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
  /** 打开系统文件框。 */
  openPicker: () => void;
  /** 摊到那个隐藏的 `<input type="file">` 上。 */
  inputProps: {
    ref: RefObject<HTMLInputElement | null>;
    type: "file";
    accept: string | undefined;
    multiple: boolean;
    disabled: boolean;
    className: string;
    tabIndex: -1;
    "aria-hidden": true;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  };
}

/**
 * 一个投放区的全部交互：点选 + 拖放 + 粘贴。
 *
 * 拖放的深度计数是为了让拖过子节点时 overlay 不闪：每进一层 +1、离开 -1，回到 0 才收起。
 */
export function useFileDrop({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  paste = "none",
  onRejected,
}: UseFileDropOptions): FileDropBinding {
  const inputRef = useRef<HTMLInputElement>(null);
  const [depth, setDepth] = useState(0);

  // 回调放 ref 里：document 上的 paste 监听不该因为父组件重渲染就反复摘挂。
  // 同步必须放在最靠前的 effect 里——下面那两个 effect 都读它。
  const latest = useRef({ onFiles, onRejected, accept, multiple, disabled });
  useEffect(() => {
    latest.current = { onFiles, onRejected, accept, multiple, disabled };
  });

  const intake = useCallback((incoming: File[]): void => {
    const current = latest.current;
    if (current.disabled || incoming.length === 0) return;
    const { accepted, rejected } = partitionByAccept(incoming, current.accept);
    if (rejected.length > 0) current.onRejected?.(rejected);
    if (accepted.length === 0) return;
    current.onFiles(current.multiple ? accepted : accepted.slice(0, 1));
  }, []);

  useEffect(() => {
    if (paste !== "window" || disabled) return;
    return registerPasteHandler((event) => {
      const files = filesFromClipboard(event.clipboardData);
      if (files.length === 0) return;
      // 在输入框里粘文字时，Office / 浏览器会顺带塞一张位图进剪贴板——那不是在传文件
      if (
        clipboardHasText(event.clipboardData) &&
        isEditableTarget(event.target)
      ) {
        return;
      }
      event.preventDefault();
      intake(files);
    });
  }, [paste, disabled, intake]);

  // 禁用态可能在拖到一半时切过来，残留的 overlay 得收掉
  useEffect(() => {
    if (disabled) setDepth(0);
  }, [disabled]);

  return {
    dragging: !disabled && depth > 0,
    dropProps: {
      onDragEnter: (event) => {
        if (disabled || !isFileDrag(event.dataTransfer)) return;
        event.preventDefault();
        setDepth((current) => current + 1);
      },
      onDragOver: (event) => {
        if (disabled || !isFileDrag(event.dataTransfer)) return;
        // 不 preventDefault 的话浏览器会拿这次拖放去打开文件
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      },
      onDragLeave: () => {
        if (disabled) return;
        setDepth((current) => Math.max(0, current - 1));
      },
      onDrop: (event) => {
        if (disabled) return;
        event.preventDefault();
        setDepth(0);
        intake(filesFromDataTransfer(event.dataTransfer));
      },
    },
    openPicker: () => {
      if (disabled) return;
      inputRef.current?.click();
    },
    inputProps: {
      ref: inputRef,
      type: "file",
      accept,
      multiple,
      disabled,
      className: "hidden",
      tabIndex: -1,
      "aria-hidden": true,
      onChange: (event) => {
        const files = Array.from(event.target.files ?? []);
        // 先清空再处理：同一个文件连选两次也要能触发 change
        event.target.value = "";
        intake(files);
      },
    },
  };
}
