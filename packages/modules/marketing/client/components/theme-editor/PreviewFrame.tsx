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
 *
 * 末尾那两条 hover 提示只活在编辑器的 iframe 里（这份 CSS 不进公开面），
 * 用来告诉租户「这一块也点得动」——选中框画在 iframe 外面，光看静止画面
 * 分不出哪些是可选单元。
 */
const FRAME_CSS = [
  `html,body{height:100%}`,
  `body{margin:0;color:var(--fg);background:var(--bg)}`,
  `html::-webkit-scrollbar{width:10px;height:10px}`,
  `html::-webkit-scrollbar-track{background:transparent}`,
  `html::-webkit-scrollbar-thumb{background:color-mix(in srgb,currentColor 25%,transparent);border-radius:5px}`,
  `html::-webkit-scrollbar-corner{background:transparent}`,
  MARKETING_SITE_CSS,
  `[data-block-id]{outline:1px dashed transparent;outline-offset:2px;transition:outline-color .12s}`,
  `[data-block-id]:hover{outline-color:color-mix(in srgb,currentColor 30%,transparent)}`,
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
  /** 选中的 block（`data-block-id`）；有值时它才是主高亮，所属 section 退成淡框。 */
  highlightBlockId?: string | null;
  /** 主高亮左上角那枚标签的文字（段 / 块的类型名）。 */
  highlightLabel?: string;
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
  highlightBlockId = null,
  highlightLabel,
}: PreviewFrameProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [host, setHost] = useState({ width: 0, height: 0 });
  const [sectionRect, setSectionRect] = useState<HighlightRect | null>(null);
  const [blockRect, setBlockRect] = useState<HighlightRect | null>(null);

  const deviceWidth = PREVIEW_DEVICES[device];
  const scale = host.width > 0 ? Math.min(1, host.width / deviceWidth) : 1;
  /** 选中 block 时它才是主角，所属 section 退成淡框做上下文。 */
  const primaryRect = blockRect ?? sectionRect;

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
      setSectionRect(null);
      setBlockRect(null);
      return;
    }

    const rectOf = (selector: string): HighlightRect | null => {
      const box = doc.querySelector(selector)?.getBoundingClientRect();
      return box
        ? {
            left: box.left * scale,
            top: box.top * scale,
            width: box.width * scale,
            height: box.height * scale,
          }
        : null;
    };

    let frame = 0;
    const measure = (): void => {
      frame = 0;
      setSectionRect(
        rectOf(`[data-section-id="${CSS.escape(highlightSectionId)}"]`),
      );
      setBlockRect(
        highlightBlockId
          ? rectOf(`[data-block-id="${CSS.escape(highlightBlockId)}"]`)
          : null,
      );
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
  }, [doc, highlightSectionId, highlightBlockId, scale]);

  return (
    <div
      ref={hostRef}
      className="min-h-0 flex-1 overflow-hidden bg-muted/30 p-3"
    >
      <div
        className="relative mx-auto overflow-hidden border bg-background shadow-sm"
        style={{ width: deviceWidth * scale, height: host.height }}
      >
        {/*
          选中框刻意只有 1px 半透明：它是「我改的是这一块」的提示，不是内容的一部分。
          原来的 2px 实色边框 + 内环会盖住段落自己的圆角与分隔线，租户看到的排版
          和访客看到的差出好几个像素——预览失真比标注不明显更糟。
        */}
        {blockRect && sectionRect ? (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 rounded-xs ring-1 ring-inset ring-primary/25"
            style={sectionRect}
          />
        ) : null}
        {primaryRect ? (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 rounded-xs bg-primary/5 ring-1 ring-inset ring-primary/70"
            style={primaryRect}
          >
            {highlightLabel ? (
              <span
                className="absolute left-0 bg-primary/70 p-1 text-xs leading-none font-medium whitespace-nowrap text-primary-foreground"
                // 标签默认贴在框**上方**；框已经顶到预览区顶端时翻到框内，
                // 否则会被外层的 overflow-hidden 裁掉。
                style={
                  primaryRect.top >= 18
                    ? { bottom: "100%", marginBottom: 2 }
                    : { top: 2 }
                }
              >
                {highlightLabel}
              </span>
            ) : null}
          </div>
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
