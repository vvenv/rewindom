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

  it("injects semantic marketing CSS and ignores host workbench styles", async () => {
    const workbenchStyle = document.createElement("style");
    workbenchStyle.setAttribute(
      "data-vite-dev-id",
      "/project/apps/client/src/index.css",
    );
    workbenchStyle.textContent = ".workbench-probe{color:blue}";
    document.head.append(workbenchStyle);

    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "slate");

    const { container } = render(
      <PreviewFrame device="tablet">
        <span>x</span>
      </PreviewFrame>,
    );

    await waitFor(() => {
      const doc = frameDoc(container);
      const head = doc?.head.textContent ?? "";
      expect(head).toContain(".btn");
      expect(head).not.toContain(".workbench-probe{color:blue}");
      // 工作台的明暗痕迹一律不进预览：访客看的是站点自己那份偏好
      expect(doc?.documentElement.classList.contains("dark")).toBe(false);
      expect(doc?.documentElement.getAttribute("data-theme")).toBeNull();
    });

    workbenchStyle.remove();
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-theme");
  });

  async function injectedCss(container: HTMLElement): Promise<string> {
    return waitFor(() => {
      const css = [
        ...(frameDoc(container)?.head.querySelectorAll(
          "[data-marketing-site-style]",
        ) ?? []),
      ]
        .map((node) => node.textContent ?? "")
        .join("");
      expect(css).not.toBe("");
      return css;
    });
  }

  it("forces a space-taking scrollbar so flush-right content stays visible", async () => {
    const { container } = render(
      <PreviewFrame device="desktop">
        <span>x</span>
      </PreviewFrame>,
    );

    expect(await injectedCss(container)).toContain("::-webkit-scrollbar");
  });

  it("draws the selection outside the iframe, scaled into host coordinates", async () => {
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
      <PreviewFrame device="desktop" highlightSectionId="sec-1">
        <div data-section-id="sec-1">hero</div>
      </PreviewFrame>,
    );

    const target = await waitFor(() => {
      const found = frameDoc(container)?.querySelector("[data-section-id]");
      expect(found).not.toBeNull();
      return found!;
    });
    target.getBoundingClientRect = () =>
      ({ left: 0, top: 100, width: 1280, height: 400 }) as DOMRect;

    act(() => {
      observers[0]?.(
        [{ contentRect: { width: 640, height: 480 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    const overlay = await waitFor(() => {
      const found = container.querySelector<HTMLElement>("[aria-hidden]");
      expect(found).not.toBeNull();
      return found!;
    });
    expect(overlay.style.left).toBe("0px");
    expect(overlay.style.top).toBe("50px");
    expect(overlay.style.width).toBe("640px");
    expect(overlay.style.height).toBe("200px");
    expect(frameDoc(container)?.body.contains(overlay)).toBe(false);

    vi.unstubAllGlobals();
  });

  it("clears the selection box when nothing is selected", async () => {
    const { container } = render(
      <PreviewFrame device="desktop" highlightSectionId={null}>
        <div data-section-id="sec-1">hero</div>
      </PreviewFrame>,
    );
    await waitFor(() => expect(frameDoc(container)).not.toBeNull());
    expect(container.querySelector("[aria-hidden]")).toBeNull();
  });

  it("renders at the device's logical width so media queries see a real viewport", async () => {
    const { container, rerender } = render(
      <PreviewFrame device="mobile">
        <span>x</span>
      </PreviewFrame>,
    );
    const frame = container.querySelector("iframe")!;
    expect(frame.style.width).toBe(`${PREVIEW_DEVICES.mobile}px`);

    rerender(
      <PreviewFrame device="desktop">
        <span>x</span>
      </PreviewFrame>,
    );
    expect(frame.style.width).toBe(`${PREVIEW_DEVICES.desktop}px`);
    expect(PREVIEW_DEVICES.desktop).toBeGreaterThanOrEqual(1024);
  });

  it("scales down to fit the panel without changing the logical viewport", () => {
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

    act(() => {
      observers[0]?.(
        [{ contentRect: { width: 640, height: 480 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    expect(frame.style.width).toBe(`${PREVIEW_DEVICES.desktop}px`);
    expect(frame.style.transform).toBe("scale(0.5)");
    expect(frame.style.transformOrigin).toBe("top left");
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
