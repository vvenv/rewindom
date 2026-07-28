import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OVERFLOW_MEASURE_ROW_CLASS,
  useOverflowRow,
} from "./useOverflowRow.js";

/** 每一项 100px 宽，「更多」按钮 60px，gap 4px —— 让期望值好算。 */
const ITEM_WIDTH = 100;
const OVERFLOW_WIDTH = 60;
const GAP = 4;

let containerWidth = 1000;
let resizeCallbacks: Array<() => void> = [];

function Harness({ itemCount }: { itemCount: number }) {
  const { containerRef, measureItemRef, measureOverflowRef, visibleCount } =
    useOverflowRow(itemCount, { gap: GAP });

  const items = Array.from({ length: itemCount }, (_, i) => i);

  return (
    <div ref={containerRef} data-testid="container">
      <span data-testid="visible-count">{visibleCount}</span>
      {visibleCount < itemCount ? <span data-testid="has-overflow" /> : null}

      <div className={OVERFLOW_MEASURE_ROW_CLASS}>
        {items.map((i) => (
          <span key={i} ref={measureItemRef(i)} data-measure-item="">
            item-{i}
          </span>
        ))}
        <span ref={measureOverflowRef} data-measure-overflow="">
          更多
        </span>
      </div>
    </div>
  );
}

beforeEach(() => {
  containerWidth = 1000;
  resizeCallbacks = [];

  // jsdom 没有布局引擎：按元素角色返回固定几何，把测量数学暴露给断言
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const width = this.hasAttribute("data-measure-overflow")
        ? OVERFLOW_WIDTH
        : this.hasAttribute("data-measure-item")
          ? ITEM_WIDTH
          : 0;
      return {
        width,
        height: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    },
  );

  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.dataset.testid === "container" ? containerWidth : 0;
    },
  );

  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resizeCallbacks.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function resize(width: number): void {
  containerWidth = width;
  act(() => {
    for (const cb of resizeCallbacks) cb();
  });
}

describe("useOverflowRow", () => {
  it("放得下时全部内联渲染，不出现「更多」", () => {
    // 4 项 = 4*100 + 3*4 = 412 <= 1000
    render(<Harness itemCount={4} />);

    expect(screen.getByTestId("visible-count")).toHaveTextContent("4");
    expect(screen.queryByTestId("has-overflow")).toBeNull();
  });

  it("放不下时给「更多」留位后再算能塞几项", () => {
    containerWidth = 400;
    render(<Harness itemCount={6} />);

    // 60(更多) + 3*(100+4) = 372 <= 400；再加一项 476 > 400 → 3 项
    expect(screen.getByTestId("visible-count")).toHaveTextContent("3");
    expect(screen.getByTestId("has-overflow")).toBeInTheDocument();
  });

  it("容器变宽后能把收起的项放回来（不是单向收缩）", () => {
    containerWidth = 300;
    render(<Harness itemCount={6} />);
    expect(screen.getByTestId("visible-count")).toHaveTextContent("2");

    resize(1000);
    expect(screen.getByTestId("visible-count")).toHaveTextContent("6");

    resize(300);
    expect(screen.getByTestId("visible-count")).toHaveTextContent("2");
  });

  it("窄到一项都放不下时全部收进「更多」", () => {
    containerWidth = 80;
    render(<Harness itemCount={3} />);

    expect(screen.getByTestId("visible-count")).toHaveTextContent("0");
    expect(screen.getByTestId("has-overflow")).toBeInTheDocument();
  });

  it("量不到尺寸时退化为全部内联渲染", () => {
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue({
      width: 0,
    } as DOMRect);
    containerWidth = 50;

    render(<Harness itemCount={5} />);

    expect(screen.getByTestId("visible-count")).toHaveTextContent("5");
  });
});
