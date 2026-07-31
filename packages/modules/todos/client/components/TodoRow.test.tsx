import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { registerI18nBundles, setupI18n } from "@be-water/client-kit";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { TODOS_I18N } from "../i18n.js";
import { TodoRow } from "./TodoRow.js";

import type { TodoListItem } from "../../shared/index.js";

const item: TodoListItem = {
  id: "todo-1",
  title: "写周报",
  completed: false,
  created_by: "user-1",
  updated_by: null,
  created_at: "2026-07-28T00:00:00.000Z",
  updated_at: "2026-07-28T00:00:00.000Z",
};

function renderRow(overrides: Partial<Parameters<typeof TodoRow>[0]> = {}) {
  const props = {
    item,
    canWrite: true,
    onToggle: vi.fn().mockResolvedValue(true),
    onRename: vi.fn().mockResolvedValue(true),
    onRemove: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  render(<TodoRow {...props} />);
  return props;
}

function startEditing(title = "写周报") {
  fireEvent.doubleClick(screen.getByText(title));
  return screen.getByRole("textbox");
}

describe("TodoRow", () => {
  beforeAll(() => {
    registerI18nBundles([TODOS_I18N]);
    setupI18n();
  });

  it("双击标题进入编辑，回车保存新标题", async () => {
    const { onRename } = renderRow();

    const input = startEditing();
    fireEvent.change(input, { target: { value: "  写月报  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith(item, "写月报");
    });
  });

  it("Esc 放弃修改，既不保存也不删除", () => {
    const { onRename, onRemove } = renderRow();

    const input = startEditing();
    fireEvent.change(input, { target: { value: "改了一半" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);

    expect(onRename).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByText("写周报")).toBeInTheDocument();
  });

  it("失焦等同于保存", async () => {
    const { onRename } = renderRow();

    const input = startEditing();
    fireEvent.change(input, { target: { value: "写月报" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith(item, "写月报");
    });
  });

  it("改成空标题即删除该条", async () => {
    const { onRemove, onRename } = renderRow();

    const input = startEditing();
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith(item);
    });
    expect(onRename).not.toHaveBeenCalled();
  });

  it("勾选复选框直接切换完成态", async () => {
    const { onToggle } = renderRow();

    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith(item, true);
    });
  });

  it("点 × 立即删除，不弹确认", async () => {
    const { onRemove } = renderRow();

    fireEvent.click(screen.getByRole("button", { name: "删除「写周报」" }));

    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith(item);
    });
  });

  it("只读用户看不到删除按钮，双击也进不了编辑", () => {
    renderRow({ canWrite: false });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    fireEvent.doubleClick(screen.getByText("写周报"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
