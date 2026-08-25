import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FileDropZone } from "./FileDropZone.js";

function textFile(name: string, type: string): File {
  return new File(["x"], name, { type });
}

/** happy-dom 没有 DataTransfer 构造器，投放 / 粘贴只用到这几个字段。 */
function transfer(files: File[], types = ["Files"]): DataTransfer {
  return { files, types, dropEffect: "none" } as unknown as DataTransfer;
}

function pasteOnDocument(files: File[], types = ["Files"]): void {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: transfer(files, types),
  });
  document.dispatchEvent(event);
}

describe("FileDropZone", () => {
  it("拖进来的文件按 accept 过滤，不合格的不往上抛", () => {
    const onFiles = vi.fn();
    render(
      <FileDropZone
        accept="image/png"
        multiple
        onFiles={onFiles}
        paste="none"
      />,
    );

    fireEvent.drop(screen.getByRole("button"), {
      dataTransfer: transfer([
        textFile("ok.png", "image/png"),
        textFile("no.pdf", "application/pdf"),
      ]),
    });

    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles.mock.calls[0]![0].map((file: File) => file.name)).toEqual([
      "ok.png",
    ]);
  });

  it("multiple 为 false 时只取第一个——多选是 accept 之外的另一重约束", () => {
    const onFiles = vi.fn();
    render(<FileDropZone onFiles={onFiles} paste="none" />);

    fireEvent.drop(screen.getByRole("button"), {
      dataTransfer: transfer([
        textFile("a.png", "image/png"),
        textFile("b.png", "image/png"),
      ]),
    });

    expect(onFiles.mock.calls[0]![0]).toHaveLength(1);
  });

  it("截图直接粘贴就能传", () => {
    const onFiles = vi.fn();
    render(<FileDropZone accept="image/*" onFiles={onFiles} />);

    pasteOnDocument([textFile("image.png", "image/png")]);

    expect(onFiles).toHaveBeenCalledTimes(1);
  });

  /*
   * 同时挂着两个投放区（页面 + 弹层）时，粘贴只能落在最后挂载的那个身上，
   * 否则一次 Ctrl+V 会被两处同时接走，传两份。
   */
  it("多个投放区共存时，只有最后挂载的接管粘贴", () => {
    const page = vi.fn();
    const dialog = vi.fn();
    render(
      <>
        <FileDropZone accept="image/*" onFiles={page} />
        <FileDropZone accept="image/*" onFiles={dialog} />
      </>,
    );

    pasteOnDocument([textFile("image.png", "image/png")]);

    expect(dialog).toHaveBeenCalledTimes(1);
    expect(page).not.toHaveBeenCalled();
  });

  it("禁用时拖放与粘贴都不生效", () => {
    const onFiles = vi.fn();
    render(<FileDropZone disabled accept="image/*" onFiles={onFiles} />);

    fireEvent.drop(screen.getByRole("button"), {
      dataTransfer: transfer([textFile("a.png", "image/png")]),
    });
    pasteOnDocument([textFile("a.png", "image/png")]);

    expect(onFiles).not.toHaveBeenCalled();
  });

  /*
   * 从 Excel / Word 复制内容时剪贴板里会顺带躺一张位图。人在输入框里按 Ctrl+V
   * 是想粘文字，把那张图传上去纯属惊吓。
   */
  it("在输入框里粘带文字的内容，不把附带的位图当上传", () => {
    const onFiles = vi.fn();
    render(
      <>
        <input aria-label="标题" />
        <FileDropZone accept="image/*" onFiles={onFiles} />
      </>,
    );

    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: transfer(
        [textFile("image.png", "image/png")],
        ["text/plain", "Files"],
      ),
    });
    screen.getByLabelText("标题").dispatchEvent(event);

    expect(onFiles).not.toHaveBeenCalled();
  });
});
