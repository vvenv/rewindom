import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/**
 * 隐藏测量行必须用这个 className。
 *
 * 关键是 `w-max`：绝对定位元素不写宽度时会按包含块做 shrink-to-fit，
 * 会把待测项压窄、量出偏小的宽度。`w-max` 强制按 max-content 排布，
 * 量到的才是各项的自然宽度。`invisible` 而非 `hidden`——display:none 量不出尺寸。
 */
export const OVERFLOW_MEASURE_ROW_CLASS =
  "pointer-events-none invisible absolute top-0 left-0 flex w-max items-center";

export interface OverflowRow {
  /** 挂在可见容器上（需自带 `min-w-0 overflow-hidden`）。 */
  containerRef: (el: HTMLElement | null) => void;
  /** 挂在隐藏测量行里第 index 项上。 */
  measureItemRef: (index: number) => (el: HTMLElement | null) => void;
  /** 挂在隐藏测量行里的「更多」按钮上。 */
  measureOverflowRef: (el: HTMLElement | null) => void;
  /** 前多少项内联渲染，其余交给「更多」下拉。 */
  visibleCount: number;
}

/**
 * 按容器实际宽度决定内联渲染多少项，放不下的交给调用方收进「更多」下拉。
 *
 * 做法是在容器里放一份 `visibility:hidden` 的测量行（渲染全部项），量它得到各项
 * 自然宽度——这样「已被收起的项」的宽度依然可知，容器变宽时能正确放回来。
 * 只靠可见项测量的实现会单向收缩、再也涨不回去。
 *
 * jsdom 里 `getBoundingClientRect()` 恒为 0 且没有 ResizeObserver，此时退化为
 * 「全部内联渲染」——测试拿到的是完整导航，不会因为量不到而全空。
 */
export function useOverflowRow(
  itemCount: number,
  { gap = 4 }: { gap?: number } = {},
): OverflowRow {
  const [visibleCount, setVisibleCount] = useState(itemCount);

  const containerEl = useRef<HTMLElement | null>(null);
  const itemEls = useRef<Array<HTMLElement | null>>([]);
  const overflowEl = useRef<HTMLElement | null>(null);

  const recompute = useCallback(() => {
    const container = containerEl.current;
    if (!container) return;

    const available = container.clientWidth;
    const widths = itemEls.current
      .slice(0, itemCount)
      .map((el) => el?.getBoundingClientRect().width ?? 0);

    // 尺寸还没量到（首帧 / jsdom / 字体未加载）——保持全部可见，等下一次回调
    if (widths.length < itemCount || widths.some((w) => w === 0)) {
      setVisibleCount(itemCount);
      return;
    }

    const totalGap = gap * Math.max(0, itemCount - 1);
    const total = widths.reduce((sum, w) => sum + w, 0) + totalGap;
    if (total <= available) {
      setVisibleCount(itemCount);
      return;
    }

    // 放不下：先给「更多」按钮留位，再看能塞几项
    let used = overflowEl.current?.getBoundingClientRect().width ?? 0;
    let count = 0;
    for (const width of widths) {
      const next = used + width + gap;
      if (next > available) break;
      used = next;
      count += 1;
    }
    setVisibleCount(count);
  }, [gap, itemCount]);

  useLayoutEffect(() => {
    itemEls.current.length = itemCount;
    recompute();
  }, [itemCount, recompute]);

  useEffect(() => {
    const container = containerEl.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => recompute());
    observer.observe(container);
    // 也盯测量行：字体加载完成、文案变化都会改变各项宽度
    const measureRow = itemEls.current[0]?.parentElement;
    if (measureRow) observer.observe(measureRow);

    return () => observer.disconnect();
  }, [recompute]);

  const containerRef = useCallback((el: HTMLElement | null) => {
    containerEl.current = el;
  }, []);

  const measureItemRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      itemEls.current[index] = el;
    },
    [],
  );

  const measureOverflowRef = useCallback((el: HTMLElement | null) => {
    overflowEl.current = el;
  }, []);

  return { containerRef, measureItemRef, measureOverflowRef, visibleCount };
}
