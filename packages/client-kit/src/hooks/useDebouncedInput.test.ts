import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { useDebouncedInput, DEFAULT_DEBOUNCE_MS } from "./useDebouncedInput";

describe("useDebouncedInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with empty string when value is undefined", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedInput({ value: undefined, onCommit }),
    );

    expect(result.current.inputValue).toBe("");
  });

  it("should initialize with provided value", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedInput({ value: "initial", onCommit }),
    );

    expect(result.current.inputValue).toBe("initial");
  });

  it("should use default debounce time", () => {
    const onCommit = vi.fn();
    renderHook(() => useDebouncedInput({ value: "test", onCommit }));

    expect(DEFAULT_DEBOUNCE_MS).toBe(300);
  });

  it("should update inputValue when value prop changes", () => {
    const onCommit = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedInput({ value, onCommit }),
      { initialProps: { value: "initial" } },
    );

    expect(result.current.inputValue).toBe("initial");

    rerender({ value: "updated" });
    expect(result.current.inputValue).toBe("updated");
  });

  it("should commit on Enter key press", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedInput({ value: "test", onCommit }),
    );

    act(() => {
      result.current.inputProps.onKeyDown({
        key: "Enter",
        preventDefault: vi.fn(),
        currentTarget: { value: "test-value" },
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });

    expect(onCommit).toHaveBeenCalledWith("test-value");
  });

  it("should not commit on other key presses", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedInput({ value: "test", onCommit }),
    );

    act(() => {
      result.current.inputProps.onKeyDown({
        key: "Escape",
        preventDefault: vi.fn(),
        currentTarget: { value: "test-value" },
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("should handle composition start", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedInput({ value: "test", onCommit }),
    );

    act(() => {
      result.current.inputProps.onCompositionStart();
    });

    act(() => {
      result.current.inputProps.onChange({
        target: { value: "new-value" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("should handle composition end and commit", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedInput({ value: "test", onCommit, debounceMs: 100 }),
    );

    act(() => {
      result.current.inputProps.onCompositionStart();
    });

    act(() => {
      result.current.inputProps.onCompositionEnd({
        currentTarget: { value: "composed-value" },
      } as unknown as React.CompositionEvent<HTMLInputElement>);
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(onCommit).toHaveBeenCalledWith("composed-value");
  });

  it("should clear input and commit empty value", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedInput({ value: "test", onCommit }),
    );

    act(() => {
      result.current.clear();
    });

    expect(result.current.inputValue).toBe("");
    expect(onCommit).toHaveBeenCalledWith("");
  });

  it("should debounce input changes", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedInput({ value: "test", onCommit, debounceMs: 100 }),
    );

    act(() => {
      result.current.inputProps.onChange({
        target: { value: "new-value" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(onCommit).toHaveBeenCalledWith("new-value");
  });

  it("should cancel previous debounce timer on new input", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedInput({ value: "test", onCommit, debounceMs: 100 }),
    );

    act(() => {
      result.current.inputProps.onChange({
        target: { value: "value1" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    act(() => {
      result.current.inputProps.onChange({
        target: { value: "value2" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(onCommit).toHaveBeenCalledWith("value2");
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("should update onCommit ref when onCommit changes", () => {
    const onCommit1 = vi.fn();
    const onCommit2 = vi.fn();
    const { result, rerender } = renderHook(
      ({ onCommit }) => useDebouncedInput({ value: "test", onCommit }),
      { initialProps: { onCommit: onCommit1 } },
    );

    act(() => {
      result.current.inputProps.onChange({
        target: { value: "value1" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onCommit1).toHaveBeenCalledWith("value1");

    rerender({ onCommit: onCommit2 });

    act(() => {
      result.current.inputProps.onChange({
        target: { value: "value2" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onCommit2).toHaveBeenCalledWith("value2");
  });

  it("should cleanup debounce timer on unmount", () => {
    const onCommit = vi.fn();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const { result, unmount } = renderHook(() =>
      useDebouncedInput({ value: "test", onCommit, debounceMs: 100 }),
    );

    act(() => {
      result.current.inputProps.onChange({
        target: { value: "new-value" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    unmount();

    // Timer cleanup happens in useEffect cleanup
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
