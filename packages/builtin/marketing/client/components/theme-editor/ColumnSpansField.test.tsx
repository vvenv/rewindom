import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColumnSpansField } from "./ColumnSpansField.js";

function renderField(value: string, columnCount: number) {
  const onChange = vi.fn();
  render(
    <ColumnSpansField
      id="spans"
      value={value}
      columnCount={columnCount}
      onChange={onChange}
    />,
  );
  return { onChange };
}

/** 多滑块的每个把手都是一处分栏点，按方向键就能挪。 */
function thumbs(): HTMLElement[] {
  return screen.getAllByRole("slider");
}

describe("ColumnSpansField", () => {
  it("每栏占几份都摆出来，顺序与列一致", () => {
    renderField("3:7:2", 3);
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText(/3 栏/u)).toBeTruthy();
  });

  /* 分栏点 = 份额的前缀和；两列一条界线，三列两条 */
  it("界线数比列数少一条", () => {
    renderField("3:9", 2);
    expect(thumbs()).toHaveLength(1);
    expect(thumbs()[0]).toHaveAttribute("aria-valuenow", "3");
  });

  it("三列时界线落在两处前缀和上", () => {
    renderField("3:7:2", 3);
    expect(thumbs().map((thumb) => thumb.getAttribute("aria-valuenow"))).toEqual(
      ["3", "10"],
    );
  });

  /* 存量的旧比例写法要先读懂，控件显示的必须与渲染出来的是同一份 */
  it("旧的比例写法照样显示成份额", () => {
    renderField("1:3", 2);
    expect(thumbs()[0]).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByText("9")).toBeTruthy();
  });

  it("与列数对不上时按当前列数等分显示", () => {
    renderField("3:9", 3);
    expect(thumbs().map((thumb) => thumb.getAttribute("aria-valuenow"))).toEqual(
      ["4", "8"],
    );
  });

  it("拖动界线写回的是份额而不是界线位置", () => {
    const { onChange } = renderField("3:9", 2);
    fireEvent.keyDown(thumbs()[0]!, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("4:8");
  });

  it("界线挪不出边界，每栏至少留一份", () => {
    const { onChange } = renderField("1:11", 2);
    fireEvent.keyDown(thumbs()[0]!, { key: "ArrowLeft" });
    expect(onChange).not.toHaveBeenCalled();
  });

  /* 只有一列时没有「列宽」可言，说清楚去哪儿加列，而不是画一条动不了的滑块 */
  it("只有一列时不画滑块", () => {
    renderField("12", 1);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByText(/加一列/u)).toBeTruthy();
  });
});
