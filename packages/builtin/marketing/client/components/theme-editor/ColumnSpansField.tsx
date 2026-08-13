import { type ReactElement } from "react";

import { Slider } from "@be-water/ui/slider";
import { useTranslation } from "react-i18next";

import {
  formatGroupSpans,
  GROUP_GRID,
  resolveGroupSpans,
} from "../../../shared/sections/_common/settings.js";

/**
 * 列宽控件：一条多滑块，每个滑块是一处**分栏点**。
 *
 * 拖的是列与列之间的那条界线，而不是「第 2 栏占几份」——后者要求租户自己保证几个
 * 数加起来是 12，改一栏就得回头把别的栏也调一遍。拖界线的话总宽天然守恒，配不出
 * 「加起来不满一行」的版式，这正是原来那个七选一预设下拉想保证的事；区别只是现在
 * 不必从七档里挑一档最接近的。
 *
 * 列数不在这里改：列是 block，在左侧结构树里加减（`max_blocks: 4`）。这个控件跟着
 * 当前列数走——租户刚加完一列回到这儿，看到的就是四个数、三条界线。
 */
export function ColumnSpansField({
  id,
  value,
  columnCount,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  /** 这一段当前有几列（`groupColumns` 数出来的）。 */
  columnCount: number;
  disabled?: boolean;
  onChange: (next: string) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");

  /*
   * 一律先过 `resolveGroupSpans`：存值可能与当前列数对不上（刚加了一列）。
   * 控件显示的必须与**渲染出来的**是同一份。
   */
  const spans = resolveGroupSpans(value, columnCount);

  if (columnCount <= 1) {
    return (
      <p className="text-xs text-muted-foreground" id={id}>
        {t("editor.columnSpansSingle")}
      </p>
    );
  }

  /*
   * 份额 → 界线位置：累加前缀和，最后一段不需要界线。
   * `[3, 7, 2]` → 界线在 3 和 10。
   */
  const cuts = spans
    .slice(0, -1)
    .map((_, index) =>
      spans.slice(0, index + 1).reduce((sum, span) => sum + span, 0),
    );

  const commit = (nextCuts: number[]): void => {
    const next = nextCuts.map((cut, index) =>
      index === 0 ? cut : cut - nextCuts[index - 1]!,
    );
    next.push(GROUP_GRID - nextCuts[nextCuts.length - 1]!);
    onChange(formatGroupSpans(next));
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 每栏占几份，按列的顺序摆——与预览里从左到右一一对上 */}
      <div className="flex gap-1" aria-hidden>
        {spans.map((span, index) => (
          <div
            key={index}
            className="rounded-sm bg-muted py-1 text-center text-xs tabular-nums text-muted-foreground"
            style={{ flexGrow: span, flexBasis: 0 }}
          >
            {span}
          </div>
        ))}
      </div>
      <Slider
        id={id}
        disabled={disabled}
        value={cuts}
        min={1}
        max={GROUP_GRID - 1}
        step={1}
        /* 每栏至少一份：界线不许重合，也不许压到两端 */
        minStepsBetweenThumbs={1}
        aria-label={t("editor.setting.columns_layout")}
        onValueChange={commit}
      />
      <p className="text-xs text-muted-foreground">
        {t("editor.columnSpansHint", {
          count: columnCount,
          spans: spans.join(" / "),
        })}
      </p>
    </div>
  );
}
