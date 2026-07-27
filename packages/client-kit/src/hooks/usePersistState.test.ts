import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePersistState } from "./usePersistState";

const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] ?? null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  clear() {
    this.store = {};
  },
};

describe("usePersistState", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.stubGlobal("localStorage", mockLocalStorage);
  });

  it("should use default value when localStorage is empty", () => {
    const { result } = renderHook(() =>
      usePersistState({ key: "test", defaultValue: "default" }),
    );

    expect(result.current[0]).toBe("default");
  });

  it("should load value from localStorage", () => {
    mockLocalStorage.setItem("test", '"saved"');

    const { result } = renderHook(() =>
      usePersistState({ key: "test", defaultValue: "default" }),
    );

    expect(result.current[0]).toBe("saved");
  });

  it("should save value to localStorage on change", () => {
    const { result } = renderHook(() =>
      usePersistState({ key: "test", defaultValue: "default" }),
    );

    act(() => {
      result.current[1]("new");
    });

    expect(mockLocalStorage.getItem("test")).toBe('"new"');
  });

  it("should use custom serialize/deserialize", () => {
    mockLocalStorage.setItem("test", "true");

    const { result } = renderHook(() =>
      usePersistState({
        key: "test",
        defaultValue: false,
        serialize: (v) => String(v),
        deserialize: (v) => v === "true",
      }),
    );

    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1](false);
    });

    expect(mockLocalStorage.getItem("test")).toBe("false");
  });

  it("should handle localStorage errors gracefully", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("localStorage error");
      },
      setItem: () => {},
    });

    const { result } = renderHook(() =>
      usePersistState({ key: "test", defaultValue: "default" }),
    );

    expect(result.current[0]).toBe("default");
  });

  it("should handle setItem errors gracefully", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("localStorage error");
      },
    });

    const { result } = renderHook(() =>
      usePersistState({ key: "test", defaultValue: "default" }),
    );

    expect(() => {
      act(() => {
        result.current[1]("new");
      });
    }).not.toThrow();
  });
});
