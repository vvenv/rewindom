import { type ReactElement } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@be-water/ui/tooltip";
import { cn } from "@be-water/ui/utils";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FieldInfoTipProps {
  /** 说明正文（调用方自己翻译好）。 */
  text: string;
  /** 气泡出现在哪一侧：窄侧栏用 `left`，宽表单用默认的 `top`。 */
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/**
 * 字段标签后的说明气泡：使用说明收进 tooltip，别常驻占版面。
 *
 * 一屏十来个字段、每个再压两行灰字，300px 的侧栏会糊成一片，真正要看的控件反被
 * 挤到折叠线以下。**只有使用说明走这里**——校验错误（`FieldError`）、当前状态与
 * 后果提示（「该能力未开通」「删除不可恢复」）仍要摊开写，那些不该靠 hover 才看到。
 *
 * 触发器是真正的 `<button>` 且**进 tab 序**：Radix Tooltip 只认指针与焦点，
 * 不可聚焦的话键盘用户就再也拿不到这段话；说明原文同时写进 `aria-label`，
 * 读屏不必先把气泡打开。按钮嵌在 `<label>` 里也不会误切 checkbox / switch——
 * 按 HTML 规范，label 对「交互式后代」上的点击不做激活转发（happy-dom 没实现
 * 这条例外，测试里点它仍会切开关，别照着那个行为改代码）。
 */
export function FieldInfoTip({
  text,
  side = "top",
  className,
}: FieldInfoTipProps): ReactElement {
  const { t } = useTranslation("common");

  return (
    /*
     * 自带 Provider：这颗气泡会被撒进各种表单，缺 Provider 时 Radix 直接抛错整页白屏。
     * 嵌在全局 Provider（`apps/client/src/main.tsx`）里也没关系，Radix 允许套娃。
     */
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            // 写 aria-label 而不是塞 sr-only 文字：按钮嵌在 `<label>` 里时，
            // 无障碍名会被外层标签抢走（读成「路径」），说明就丢了
            aria-label={t("fieldInfo", { text })}
            className={cn(
              "shrink-0 text-muted-foreground/70 transition-colors hover:text-foreground",
              className,
            )}
          >
            <Info className="size-3.5" />
          </button>
        </TooltipTrigger>
        {/* `whitespace-pre-line`：说明里换行分段（如「是什么」+「怎么操作」）要照出来 */}
        <TooltipContent side={side} className="max-w-64 whitespace-pre-line">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
