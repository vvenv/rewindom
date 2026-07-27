import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { DebouncedSearchInput } from "./DebouncedSearchInput";

vi.mock("../hooks/useDebouncedInput", () => ({
  useDebouncedInput: ({
    value,
    onCommit: _onCommit,
  }: {
    value: string | undefined;
    onCommit: (value: string) => void;
  }) => ({
    inputValue: value || "",
    clear: vi.fn(),
    inputProps: {
      value: value || "",
      onChange: vi.fn(),
    },
  }),
}));

describe("DebouncedSearchInput", () => {
  it("应该渲染搜索输入框", () => {
    render(<DebouncedSearchInput value="" onCommit={vi.fn()} />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("应该显示搜索图标", () => {
    render(<DebouncedSearchInput value="" onCommit={vi.fn()} />);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("应该使用自定义 placeholder", () => {
    render(
      <DebouncedSearchInput
        value=""
        onCommit={vi.fn()}
        placeholder="搜索订单"
      />,
    );

    const input = screen.getByPlaceholderText("搜索订单");
    expect(input).toBeInTheDocument();
  });

  it("应该支持自定义 className", () => {
    render(
      <DebouncedSearchInput
        value=""
        onCommit={vi.fn()}
        className="custom-class"
      />,
    );

    const input = screen.getByRole("textbox");
    expect(input.parentElement).toHaveClass("custom-class");
  });

  it("应该显示初始值", () => {
    render(<DebouncedSearchInput value="test" onCommit={vi.fn()} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("test");
  });

  it("应该处理空值", () => {
    render(<DebouncedSearchInput value={undefined} onCommit={vi.fn()} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("应该支持 showClear 选项", () => {
    render(
      <DebouncedSearchInput
        value="test"
        onCommit={vi.fn()}
        showClear={false}
      />,
    );

    // Should not show clear button when showClear is false
    expect(screen.queryByLabelText("清除搜索")).not.toBeInTheDocument();
  });

  it("应该支持自定义 debounceMs", () => {
    render(
      <DebouncedSearchInput value="" onCommit={vi.fn()} debounceMs={500} />,
    );

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("应该传递其他 input props", () => {
    render(
      <DebouncedSearchInput
        value=""
        onCommit={vi.fn()}
        disabled
        maxLength={100}
      />,
    );

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("maxLength", "100");
  });
});
