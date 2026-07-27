import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { DialogButton } from "./DialogButton.js";

// 真实渲染 Radix Dialog：content 仅在 open 时挂载到 portal，
// 因此需要先点击触发器打开对话框，再断言内部结构。
describe("DialogButton", () => {
  it("应渲染触发器与标题", async () => {
    render(
      <DialogButton
        trigger={<button type="button">打开</button>}
        title="测试对话框"
        description="描述文字"
      >
        <p>内容</p>
      </DialogButton>,
    );

    // 触发器始终渲染
    expect(screen.getByRole("button", { name: "打开" })).toBeInTheDocument();

    // 打开对话框后可见标题/描述/内容
    fireEvent.click(screen.getByRole("button", { name: "打开" }));
    await screen.findByRole("dialog");

    expect(screen.getByText("测试对话框")).toBeInTheDocument();
    expect(screen.getByText("描述文字")).toBeInTheDocument();
    expect(screen.getByText("内容")).toBeInTheDocument();
  });

  it("应渲染 footer", async () => {
    render(
      <DialogButton
        trigger={<button type="button">打开</button>}
        title="标题"
        footer={<button type="button">确认</button>}
      >
        <p>内容</p>
      </DialogButton>,
    );

    fireEvent.click(screen.getByRole("button", { name: "打开" }));
    await screen.findByRole("dialog");

    expect(screen.getByRole("button", { name: "确认" })).toBeInTheDocument();
  });

  it("初始 open 状态应为 false", () => {
    render(
      <DialogButton trigger={<button type="button">打开</button>} title="标题">
        <p>内容</p>
      </DialogButton>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("无描述时不应渲染 DialogDescription", async () => {
    render(
      <DialogButton trigger={<button type="button">打开</button>} title="标题">
        <p>内容</p>
      </DialogButton>,
    );

    fireEvent.click(screen.getByRole("button", { name: "打开" }));
    const dialog = await screen.findByRole("dialog");

    expect(dialog.querySelector('[data-slot="dialog-description"]')).toBeNull();
  });

  it("无 footer 时不应渲染 DialogFooter", async () => {
    render(
      <DialogButton trigger={<button type="button">打开</button>} title="标题">
        <p>内容</p>
      </DialogButton>,
    );

    fireEvent.click(screen.getByRole("button", { name: "打开" }));
    const dialog = await screen.findByRole("dialog");

    expect(dialog.querySelector('[data-slot="dialog-footer"]')).toBeNull();
  });

  it("应渲染 header 与 content", async () => {
    render(
      <DialogButton trigger={<button type="button">打开</button>} title="标题">
        <p>内容</p>
      </DialogButton>,
    );

    fireEvent.click(screen.getByRole("button", { name: "打开" }));
    const dialog = await screen.findByRole("dialog");

    // content 本身即 dialog role 元素
    expect(dialog).toBeInTheDocument();
    // header 在 content 内部，包含标题
    expect(screen.getByText("标题")).toBeInTheDocument();
  });
});
