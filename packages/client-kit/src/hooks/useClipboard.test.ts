import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { useClipboard } from "./useClipboard";

function mockNavigatorClipboard(
  writeText: ReturnType<typeof vi.fn>,
): void {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

describe("useClipboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应该成功复制文本到剪贴板", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    mockNavigatorClipboard(writeTextMock);

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("test text");
    });

    expect(writeTextMock).toHaveBeenCalledWith("test text");
    expect(result.current.copied).toBe(true);
  });

  it("应该在2秒后重置复制状态", async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    mockNavigatorClipboard(writeTextMock);

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("test text");
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.copied).toBe(false);
    vi.useRealTimers();
  });

  it("应该处理复制失败的情况", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const writeTextMock = vi.fn().mockRejectedValue(new Error("Copy failed"));
    mockNavigatorClipboard(writeTextMock);

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("test text");
    });

    expect(result.current.copied).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
