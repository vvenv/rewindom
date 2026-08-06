import { useEffect, useRef, useState, type ReactNode } from "react";

import { createPortal } from "react-dom";

import { MARKETING_SITE_CSS } from "../../../shared/marketing-site-css.js";
import { PreviewDocumentContext } from "../../lib/preview-document-context.js";

/**
 * 预览设备的**逻辑视口宽度**：iframe 真的按这个宽度渲染，媒体查询看到的就是它。
 *
 * 桌面给 1280 而不是「占满面板」：编辑器中间栏只有 600～800px，直接占满的话
 * `lg:` 断点永远不触发，文档页的侧栏会堆叠——那预览的就不是桌面版了。
 * 面板装不下时整体等比缩小（见 `scale`），保证看到的版式与真实断点一致。
 */
export const PREVIEW_DEVICES = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
} as const;

export type PreviewDevice = keyof typeof PREVIEW_DEVICES;

const STYLE_MARK = "data-marketing-site-style";

/**
 * 只做 iframe 布局复位；官网语义 CSS 用 `MARKETING_SITE_CSS` 注入，**不**克隆工作台 `index.css`。
 *
 * 滚动条显式样式化是**必须**的：macOS 默认是覆盖式滚动条，不占布局宽度，
 * 会悬浮在内容最右侧十几个像素上——通栏 section 的右边缘与选中框正好被盖住。
 */
const FRAME_CSS = [
  `html,body{height:100%}`,
  `body{margin:0;color:var(--fg);background:var(--bg)}`,
  `html::-webkit-scrollbar{width:10px;height:10px}`,
  `html::-webkit-scrollbar-track{background:transparent}`,
  `html::-webkit-scrollbar-thumb{background:color-mix(in srgb,currentColor 25%,transparent);border-radius:5px}`,
  `html::-webkit-scrollbar-corner{background:transparent}`,
  MARKETING_SITE_CSS,
].join("\n");

function injectMarketingStyles(to: Document): void {
  for (const stale of to.head.querySelectorAll(`[${STYLE_MARK}]`)) {
    stale.remove();
  }
  const style = to.createElement("style");
  style.setAttribute(STYLE_MARK, "");
  style.textContent = FRAME_CSS;
  to.head.append(style);
}

interface PreviewFrameProps {
  device: PreviewDevice;
  children: ReactNode;
  /** iframe 文档就绪 / 卸载时回调，供外部做滚动定位。 */
  onDocumentChange?: (doc: Document | null) => void;
  /** 要高亮的 section（`data-section-id`）。高亮画在 iframe **外面**。 */
  highlightSectionId?: string | null;
}

interface HighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * 设备预览框。
 *
 * 用 iframe 而不是缩容器宽度：站点的响应式断点是**视口**媒体查询。
 * 内容走 `createPortal`，与编辑器同一棵 React 树。
 */
export function PreviewFrame({
  device,
  children,
  onDocumentChange,
  highlightSectionId = null,
}: PreviewFrameProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [host, setHost] = useState({ width: 0, height: 0 });
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);

  const deviceWidth = PREVIEW_DEVICES[device];
  const scale = host.width > 0 ? Math.min(1, host.width / deviceWidth) : 1;

  const attach = (): void => {
    setDoc(frameRef.current?.contentDocument ?? null);
  };

  useEffect(() => {
    const element = hostRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box) setHost({ width: box.width, height: box.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    onDocumentChange?.(doc);
    return () => onDocumentChange?.(null);
  }, [doc, onDocumentChange]);

  /*
   * 明暗**不**在这里同步：iframe 里渲染的 `TenantSiteView` 自己会把访客偏好
   * （`data-site-color-mode`）打到这份 document 的 `<html>` 上，与访客实站同一条路径。
   * 这里再抄一遍工作台的 `.dark` / `localStorage.theme`，预览就会跟着管理台的
   * 明暗走，而访客看到的根本是另一态。
   */
  useEffect(() => {
    if (!doc) return;
    injectMarketingStyles(doc);
  }, [doc]);

  useEffect(() => {
    const view = doc?.defaultView;
    if (!doc || !view || !highlightSectionId) {
      setHighlight(null);
      return;
    }

    let frame = 0;
    const measure = (): void => {
      frame = 0;
      const target = doc.querySelector(
        `[data-section-id="${CSS.escape(highlightSectionId)}"]`,
      );
      if (!target) {
        setHighlight(null);
        return;
      }
      const box = target.getBoundingClientRect();
      setHighlight({
        left: box.left * scale,
        top: box.top * scale,
        width: box.width * scale,
        height: box.height * scale,
      });
    };
    const schedule = (): void => {
      frame ||= view.requestAnimationFrame(measure);
    };

    measure();
    view.addEventListener("scroll", schedule, { passive: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(doc.documentElement);
    const content = new MutationObserver(schedule);
    content.observe(doc.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });

    return () => {
      if (frame) view.cancelAnimationFrame(frame);
      view.removeEventListener("scroll", schedule);
      resize.disconnect();
      content.disconnect();
    };
  }, [doc, highlightSectionId, scale]);

  return (
    <div
      ref={hostRef}
      className="min-h-0 flex-1 overflow-hidden bg-muted/30 p-3"
    >
      <div
        className="relative mx-auto overflow-hidden border bg-background shadow-sm"
        style={{ width: deviceWidth * scale, height: host.height }}
      >
        {highlight ? (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 border-2 border-primary inset-ring-2 inset-ring-primary/20"
            style={highlight}
          />
        ) : null}
        <iframe
          ref={frameRef}
          onLoad={attach}
          title="preview"
          srcDoc="<!doctype html><html><head></head><body></body></html>"
          className="border-0"
          style={{
            width: deviceWidth,
            height: host.height / scale,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
      {doc ? (
        <PreviewDocumentContext.Provider value={doc}>
          {createPortal(children, doc.body)}
        </PreviewDocumentContext.Provider>
      ) : null}
    </div>
  );
}
