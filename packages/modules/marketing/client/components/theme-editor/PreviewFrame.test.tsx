import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PREVIEW_DEVICES, PreviewFrame } from "./PreviewFrame.js";

function frameDoc(container: HTMLElement): Document | null {
  return container.querySelector("iframe")?.contentDocument ?? null;
}

describe("PreviewFrame", () => {
  it("renders the preview inside the iframe document, not the host page", async () => {
    const { container } = render(
      <PreviewFrame device="desktop">
        <p data-testid="preview-content">hello</p>
      </PreviewFrame>,
    );

    await waitFor(() => {
      expect(frameDoc(container)?.body.querySelector("p")).not.toBeNull();
    });
    // 宿主文档里不该有一份——否则媒体查询仍按工作台视口算
    expect(container.querySelector("[data-testid=preview-content]")).toBeNull();
  });

  it("keeps click handlers working across the document boundary", async () => {
    const onClick = vi.fn();
    const { container } = render(
      <PreviewFrame device="mobile">
        <button type="button" onClick={onClick}>
          pick
        </button>
      </PreviewFrame>,
    );

    await waitFor(() => expect(frameDoc(container)).not.toBeNull());
    const button = await waitFor(() => {
      const found = frameDoc(container)?.body.querySelector("button");
      expect(found).not.toBeNull();
      return found!;
    });

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("copies host stylesheets and theme class into the frame", async () => {
    const style = document.createElement("style");
    style.textContent = ".probe{color:red}";
    document.head.append(style);
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "slate");

    const { container } = render(
      <PreviewFrame device="tablet">
        <span>x</span>
      </PreviewFrame>,
    );

    await waitFor(() => {
      const doc = frameDoc(container);
      expect(doc?.head.textContent).toContain(".probe{color:red}");
      expect(doc?.documentElement.className).toContain("dark");
      expect(doc?.documentElement.getAttribute("data-theme")).toBe("slate");
    });

    style.remove();
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-theme");
  });

  it("does not hard-code a solid body background over the host theme", async () => {
    const { container } = render(
      <PreviewFrame device="desktop">
        <span>x</span>
      </PreviewFrame>,
    );

    await waitFor(() => expect(frameDoc(container)).not.toBeNull());
    const marked = [
      ...(frameDoc(container)?.head.querySelectorAll("[data-preview-style]") ??
        []),
    ];
    // 只允许布局复位；纯色 background 会盖住 index.css 的 body 径向渐变
    expect(
      marked.some((node) =>
        (node.textContent ?? "").includes("background:var(--background"),
      ),
    ).toBe(false);
  });

  it("renders at the device's logical width so media queries see a real viewport", async () => {
    const { container, rerender } = render(
      <PreviewFrame device="mobile">
        <span>x</span>
      </PreviewFrame>,
    );
    const frame = container.querySelector("iframe")!;
    expect(frame.style.width).toBe(`${PREVIEW_DEVICES.mobile}px`);

    // 桌面是固定的 1280 逻辑宽度，不是「面板有多宽就多宽」——
    // 否则窄面板里 `lg:` 断点永远不触发，预览的就不是桌面版
    rerender(
      <PreviewFrame device="desktop">
        <span>x</span>
      </PreviewFrame>,
    );
    expect(frame.style.width).toBe(`${PREVIEW_DEVICES.desktop}px`);
    expect(PREVIEW_DEVICES.desktop).toBeGreaterThanOrEqual(1024);
  });

  it("scales down to fit the panel without changing the logical viewport", () => {
    // jsdom 没有布局，测试环境的 ResizeObserver 又是空 mock：换成能手动驱动的
    const observers: ResizeObserverCallback[] = [];
    class DriveableResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        observers.push(callback);
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal("ResizeObserver", DriveableResizeObserver);

    const { container } = render(
      <PreviewFrame device="desktop">
        <span>x</span>
      </PreviewFrame>,
    );
    const frame = container.querySelector("iframe")!;

    // 面板只有设备宽度的一半
    act(() => {
      observers[0]?.(
        [{ contentRect: { width: 640, height: 480 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    // 缩放只改视觉尺寸：iframe 仍按 1280 渲染，媒体查询看到的还是桌面
    expect(frame.style.width).toBe(`${PREVIEW_DEVICES.desktop}px`);
    expect(frame.style.transform).toBe("scale(0.5)");
    expect(frame.style.transformOrigin).toBe("top left");
    // 高度反向放大，缩放后正好铺满面板
    expect(frame.style.height).toBe("960px");

    vi.unstubAllGlobals();
  });

  it("never scales up, so a phone frame stays crisp in a wide panel", () => {
    const observers: ResizeObserverCallback[] = [];
    class DriveableResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        observers.push(callback);
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal("ResizeObserver", DriveableResizeObserver);

    const { container } = render(
      <PreviewFrame device="mobile">
        <span>x</span>
      </PreviewFrame>,
    );
    act(() => {
      observers[0]?.(
        [{ contentRect: { width: 1600, height: 900 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    expect(container.querySelector("iframe")!.style.transform).toBe("scale(1)");
    vi.unstubAllGlobals();
  });
});
