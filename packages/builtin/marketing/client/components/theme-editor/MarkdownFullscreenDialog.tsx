import { lazy, Suspense, useState, type ReactElement } from "react";

import { Button } from "@rewindom/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rewindom/ui/dialog";
import { Spinner } from "@rewindom/ui/spinner";
import { Maximize2 } from "lucide-react";
import { useTranslation } from "react-i18next";

/** 编辑器工具链（rehype / prism）只在真的点开全屏时才下载。 */
const MarkdownFullscreenEditor = lazy(() =>
  import("./MarkdownFullscreenEditor.js").then((module) => ({
    default: module.MarkdownFullscreenEditor,
  })),
);

/**
 * `richtext` 字段的第二条路：**侧栏里默认还是那个 textarea**，这里只多一颗按钮。
 *
 * 不把编辑器嵌进侧栏，是因为侧栏只有 300px：工具栏会折行，实时预览没地方放，
 * 而正文段（`prose`、会员门禁提示）动辄几百字，在这么窄的框里改等于隔着门缝写文章。
 * 反过来，改一个错别字也不该被强行推进全屏——所以两条路都留着，改的是同一个值。
 *
 * 弹层里的编辑是**即时写回**的，与其它设置项同口径：草稿由编辑器顶栏统一保存，
 * 这里再做一层「确定 / 取消」只会让「关掉弹层算不算保存」变成一个要猜的问题。
 */
export function MarkdownFullscreenDialog({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  /** 字段标签；全屏后侧栏看不见了，得由弹层标题接住「我在改哪一项」。 */
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (next: string) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="-my-1 h-auto px-1.5 py-0.5 text-xs font-normal text-muted-foreground"
        >
          <Maximize2 className="size-3.5" />
          {t("editor.richtextFullscreen")}
        </Button>
      </DialogTrigger>
      {/*
       * 真·全屏：`DialogContent` 默认是屏幕中间一张 `sm:max-w-sm` 的小卡片，必须把
       * 定位（`top/left` + `translate`）、宽度上限（含 **`sm:` 断点那一条**）、圆角与内边距
       * 一并盖掉。少盖 `sm:max-w-none`，在任何 ≥640px 的屏幕上就会缩回 384px 宽——
       * 也就是「全屏编辑」四个字最不该出现的那种样子。
       */}
      <DialogContent className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-none">
        <DialogHeader className="gap-0.5 border-b px-4 py-2.5 pr-12">
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {t("editor.richtextFullscreenHint")}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Spinner className="size-5" />
              </div>
            }
          >
            <MarkdownFullscreenEditor
              value={value}
              placeholder={placeholder}
              onChange={onChange}
            />
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
}
