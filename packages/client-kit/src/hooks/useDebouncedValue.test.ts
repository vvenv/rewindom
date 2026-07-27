import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("应该返回初始值", () => {
    const { result } = renderHook(() => useDebouncedValue("initial"));

    expect(result.current.debouncedValue).toBe("initial");
  });

  it("应该在延迟后更新 debouncedValue", () => {
    const { result } = renderHook(() => useDebouncedValue("initial", 300));

    act(() => {
      result.current.flushDebounced("new value");
    });

    expect(result.current.debouncedValue).toBe("new value");
  });

  it("应该在输入变化后延迟更新", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "initial" } },
    );

    rerender({ value: "new value" });

    expect(result.current.debouncedValue).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedValue).toBe("new value");
  });

  it("应该在多次快速变化时只更新最后一次", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "initial" } },
    );

    rerender({ value: "value 1" });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "value 2" });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: "value 3" });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.debouncedValue).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.debouncedValue).toBe("value 3");
  });

  it("应该在 composition 开始时暂停更新", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "initial" } },
    );

    act(() => {
      result.current.compositionInputProps.onCompositionStart();
    });

    rerender({ value: "new value" });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedValue).toBe("initial");
  });

  it("应该在 composition 结束时立即更新", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "initial" } },
    );

    act(() => {
      result.current.compositionInputProps.onCompositionStart();
    });

    rerender({ value: "new value" });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedValue).toBe("initial");

    act(() => {
      result.current.compositionInputProps.onCompositionEnd({
        currentTarget: { value: "composed value" },
      } as React.CompositionEvent<HTMLInputElement>);
    });

    expect(result.current.debouncedValue).toBe("composed value");
  });

  it("应该在组件卸载时清理定时器", () => {
    const { result, unmount } = renderHook(() =>
      useDebouncedValue("initial", 300),
    );

    act(() => {
      result.current.flushDebounced("new value");
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should not throw error
  });

  it("应该支持自定义延迟时间", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: "initial" } },
    );

    rerender({ value: "new value" });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedValue).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.debouncedValue).toBe("new value");
  });

  it("flushDebounced 应该立即更新值", () => {
    const { result } = renderHook(() => useDebouncedValue("initial", 1000));

    act(() => {
      result.current.flushDebounced("immediate");
    });

    expect(result.current.debouncedValue).toBe("immediate");
  });

  it("flushDebounced 应该取消之前的定时器", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "initial" } },
    );

    rerender({ value: "delayed value" });

    act(() => {
      result.current.flushDebounced("immediate value");
    });

    expect(result.current.debouncedValue).toBe("immediate value");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should still be "immediate value", not "delayed value"
    expect(result.current.debouncedValue).toBe("immediate value");
  });
});
