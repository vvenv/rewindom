import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MarkdownFullscreenDialog } from "./MarkdownFullscreenDialog.js";

/**
 * 编辑器换成一个傻替身：真身把 rehype / prism 整条工具链拖进来，
 * 而这里要验的是「按钮把面板叫得出来、改的是同一个值」。
 */
vi.mock("./MarkdownFullscreenEditor.js", () => ({
  MarkdownFullscreenEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (next: string) => void;
  }) => (
    <textarea
      data-testid="md-editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

function renderDialog(overrides: { disabled?: boolean } = {}) {
  const onChange = vi.fn();
  render(
    <MarkdownFullscreenDialog
      label="正文"
      value="# 标题"
      placeholder="写点什么"
      disabled={overrides.disabled}
      onChange={onChange}
    />,
  );
  return { onChange };
}

describe("MarkdownFullscreenDialog", () => {
  it("点开之前不加载编辑器", () => {
    renderDialog();
    expect(screen.queryByTestId("md-editor")).toBeNull();
  });

  it("点开后带着当前值进面板，改动即时写回同一个字段", async () => {
    const { onChange } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /全屏编辑/u }));

    const editor = await screen.findByTestId("md-editor");
    expect(editor).toHaveValue("# 标题");

    fireEvent.change(editor, { target: { value: "# 新标题" } });
    expect(onChange).toHaveBeenCalledWith("# 新标题");
  });

  /* 全屏后侧栏的字段标签看不见了，弹层标题得接住「我在改哪一项」 */
  it("弹层标题就是字段标签", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /全屏编辑/u }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("正文");
  });

  /* 字段被禁用（如未开通的能力）时，全屏是同一条写入路径，必须一起关掉 */
  it("字段禁用时全屏入口也点不动", () => {
    renderDialog({ disabled: true });
    expect(screen.getByRole("button", { name: /全屏编辑/u })).toBeDisabled();
  });
});
