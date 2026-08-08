import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  InputSettingDef,
  SettingValues,
} from "../../../shared/section-schema.js";

import { SpacingBoxField } from "./SpacingBoxField.js";

type SpacingBoxDef = Extract<InputSettingDef, { type: "spacing_box" }>;

const DEF: SpacingBoxDef = {
  type: "spacing_box",
  id: "spacing_box",
  label: "editor.setting.spacing_box",
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  spacing: { above: -4, below: -4 },
};

function renderField(values: SettingValues = {}) {
  const onChange = vi.fn();
  render(<SpacingBoxField def={DEF} values={values} onChange={onChange} />);
  return onChange;
}

function cell(name: string): HTMLInputElement {
  return screen.getByRole("spinbutton", { name }) as HTMLInputElement;
}

function type(input: HTMLInputElement, text: string): void {
  fireEvent.change(input, { target: { value: text } });
}

describe("SpacingBoxField 输入", () => {
  /*
   * 老实现每敲一个字符就 clamp + 吸附一次：想输 12 会在敲下「1」时被吸成 0，
   * 两位数根本打不进去。草稿只在失焦 / 回车时提交，才算能打字。
   */
  it("打字期间不提交，失焦才吸附提交", () => {
    const onChange = renderField({ padding_top: 0 });
    const input = cell("上内边距");

    type(input, "1");
    type(input, "12");
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("12");

    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ padding_top: 12 }),
    );
  });

  it("回车即时提交并吸附到档位", () => {
    const onChange = renderField({ padding_top: 0 });
    const input = cell("上内边距");

    type(input, "30");
    fireEvent.keyDown(input, { key: "Enter" });
    // 档距 4：30 吸到最近的 32
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ padding_top: 32 }),
    );
  });

  it("Esc 放弃这次编辑", () => {
    const onChange = renderField({ padding_top: 8 });
    const input = cell("上内边距");

    type(input, "60");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("8");

    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("非法输入按没改过处理", () => {
    const onChange = renderField({ padding_top: 8 });
    const input = cell("上内边距");

    type(input, "abc");
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("8");
  });

  it("清空段间距等于回到「继承」", () => {
    const onChange = renderField({ spacing_above: 24 });
    const input = cell("段上间距");

    type(input, "");
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ spacing_above: -4 }),
    );
  });
});

describe("SpacingBoxField 键盘步进", () => {
  it("方向键走一档，Shift 走大档", () => {
    const onChange = renderField({ padding_bottom: 16 });
    const input = cell("下内边距");

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ padding_bottom: 20 }),
    );

    fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ padding_bottom: 0 }),
    );
  });

  // 继承是 -4 这个哨兵：往上一档得落到 0，别把「继承」当成 -4 去加
  it("「继承」向上一档到 0，0 向下一档回到继承", () => {
    const onChange = renderField({ spacing_below: -4 });
    const input = cell("段下间距");
    expect(input.value).toBe("");

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ spacing_below: 0 }),
    );

    fireEvent.keyDown(cell("段上间距"), { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ spacing_above: -4 }),
    );
  });

  it("到顶到底就夹住", () => {
    const onChange = renderField({ padding_left: 120 });

    fireEvent.keyDown(cell("左内边距"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ padding_left: 120 }),
    );
  });

  it("方向键接着草稿里的数走", () => {
    const onChange = renderField({ padding_top: 0 });
    const input = cell("上内边距");

    type(input, "40");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ padding_top: 44 }),
    );
  });
});

describe("SpacingBoxField 拖动", () => {
  it("上下拖动改上下留白，向上为加", () => {
    const onChange = renderField({ padding_top: 0 });
    const input = cell("上内边距");

    fireEvent.pointerDown(input, { button: 0, pointerId: 1, clientY: 100 });
    fireEvent.pointerMove(input, { pointerId: 1, clientY: 88 });
    fireEvent.pointerUp(input, { pointerId: 1, clientY: 88 });

    // 3px 一档、一档 4：向上 12px = 4 档 = 16
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ padding_top: 16 }),
    );
  });

  it("左右拖动改左右留白，向左为减", () => {
    const onChange = renderField({ padding_right: 40 });
    const input = cell("右内边距");

    fireEvent.pointerDown(input, { button: 0, pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(input, { pointerId: 1, clientX: 76 });
    fireEvent.pointerUp(input, { pointerId: 1, clientX: 76 });

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ padding_right: 8 }),
    );
  });

  // 手抖两像素就跳档的话，「点一下改数字」这条路就废了
  it("位移没过阈值不算拖动", () => {
    const onChange = renderField({ padding_top: 0 });
    const input = cell("上内边距");

    fireEvent.pointerDown(input, { button: 0, pointerId: 1, clientY: 100 });
    fireEvent.pointerMove(input, { pointerId: 1, clientY: 98 });
    fireEvent.pointerUp(input, { pointerId: 1, clientY: 98 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("拖动始终以按下时的值为基准，不逐帧累加", () => {
    const onChange = renderField({ padding_top: 0 });
    const input = cell("上内边距");

    fireEvent.pointerDown(input, { button: 0, pointerId: 1, clientY: 100 });
    fireEvent.pointerMove(input, { pointerId: 1, clientY: 88 });
    fireEvent.pointerMove(input, { pointerId: 1, clientY: 100 });
    fireEvent.pointerUp(input, { pointerId: 1, clientY: 100 });

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ padding_top: 0 }),
    );
  });
});

describe("SpacingBoxField 联锁", () => {
  const ZERO = {
    padding_top: 0,
    padding_right: 0,
    padding_bottom: 0,
    padding_left: 0,
  };
  const lockX = () =>
    fireEvent.click(screen.getByRole("button", { name: "左右一起改" }));
  const lockY = () =>
    fireEvent.click(screen.getByRole("button", { name: "上下一起改" }));

  it("不锁：各边独立", () => {
    const onChange = renderField(ZERO);

    fireEvent.keyDown(cell("上内边距"), { key: "ArrowUp" });

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ ...ZERO, padding_top: 4 }),
    );
  });

  it("锁水平：只带上对面那条边，上下不动", () => {
    const onChange = renderField(ZERO);
    lockX();

    fireEvent.keyDown(cell("左内边距"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        padding_left: 4,
        padding_right: 4,
        padding_top: 0,
        padding_bottom: 0,
      }),
    );

    // 锁的是水平轴，改上下仍然各管各的
    fireEvent.keyDown(cell("上内边距"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ ...ZERO, padding_top: 4 }),
    );
  });

  it("锁垂直：上下一起改，左右不动", () => {
    const onChange = renderField(ZERO);
    lockY();

    fireEvent.keyDown(cell("下内边距"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        padding_top: 4,
        padding_bottom: 4,
        padding_left: 0,
        padding_right: 0,
      }),
    );

    fireEvent.keyDown(cell("右内边距"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ ...ZERO, padding_right: 4 }),
    );
  });

  it("两轴都锁：改哪边都是四边一起", () => {
    const onChange = renderField(ZERO);
    lockX();
    lockY();

    fireEvent.keyDown(cell("左内边距"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        padding_top: 0,
        padding_bottom: 0,
        padding_left: 4,
        padding_right: 4,
      }),
    );

    fireEvent.keyDown(cell("上内边距"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        padding_top: 4,
        padding_bottom: 4,
        padding_left: 0,
        padding_right: 0,
      }),
    );
  });

  it("再点一次解锁", () => {
    const onChange = renderField(ZERO);
    lockX();
    lockX();

    fireEvent.keyDown(cell("左内边距"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ ...ZERO, padding_left: 4 }),
    );
  });

  // 段间距是「和邻段的距离」，跟段内留白不是一回事，联锁不该把它一起改了
  it("联锁不波及段间距", () => {
    const onChange = renderField({ ...ZERO, spacing_above: -4 });
    lockY();

    fireEvent.keyDown(cell("上内边距"), { key: "ArrowUp" });

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ spacing_above: -4 }),
    );
  });
});

describe("SpacingBoxField 禁用", () => {
  it("禁用时六个格子都点不动", () => {
    render(
      <SpacingBoxField def={DEF} values={{}} disabled onChange={vi.fn()} />,
    );
    for (const name of [
      "段上间距",
      "段下间距",
      "上内边距",
      "右内边距",
      "下内边距",
      "左内边距",
    ]) {
      expect(cell(name)).toBeDisabled();
    }
    for (const name of ["左右一起改", "上下一起改"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });
});
