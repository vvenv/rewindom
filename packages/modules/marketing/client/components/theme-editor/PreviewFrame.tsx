import { useEffect, useRef, useState, type ReactNode } from "react";

import { createPortal } from "react-dom";

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

/** 克隆进 iframe 的样式打个标记，重新同步时只清自己加的。 */
const STYLE_MARK = "data-preview-style";

/**
 * 只做 iframe 布局复位。背景**不要**在这里写死成 `var(--background)`——
 * 主站 body 用的是 index.css 里的径向渐变（water / slate × 明暗），
 * 硬铺纯色会和真实页面不一致。样式表克隆进来后会带上那套规则。
 *
 * 滚动条显式样式化是**必须**的：macOS 默认是覆盖式滚动条，不占布局宽度，
 * 会悬浮在内容最右侧十几个像素上——通栏 section（`width: full`）的右边缘、
 * 以及它的选中框正好被盖住。样式化 `::-webkit-scrollbar` 会让 Chrome/Safari
 * 退回占位滚动条，内容宽度自动让出这段空间。
 */
const BASE_CSS = [
  `html,body{height:100%}`,
  `body{margin:0}`,
  `html::-webkit-scrollbar{width:10px;height:10px}`,
  `html::-webkit-scrollbar-track{background:transparent}`,
  `html::-webkit-scrollbar-thumb{background:color-mix(in srgb,currentColor 25%,transparent);border-radius:5px}`,
  `html::-webkit-scrollbar-corner{background:transparent}`,
].join("");

/**
 * 把主文档的样式表复制进 iframe。
 *
 * 开发态 Vite 用内联 `<style>`、生产态是 `<link>`，两种都要覆盖；HMR 改的是
 * `<style>` 的文本内容，所以监听到 head 有任何变化就整体重来（只在开发态频繁触发）。
 */
function syncStyles(from: Document, to: Document): void {
  for (const stale of to.head.querySelectorAll(`[${STYLE_MARK}]`)) {
    stale.remove();
  }
  const base = to.createElement("style");
  base.setAttribute(STYLE_MARK, "");
  base.textContent = BASE_CSS;
  to.head.append(base);
  for (const node of from.head.querySelectorAll(
    'style, link[rel="stylesheet"]',
  )) {
    const clone = node.cloneNode(true) as HTMLElement;
    clone.setAttribute(STYLE_MARK, "");
    to.head.append(clone);
  }
}

/** 明暗 class + 配色 `data-theme` 都要跟上，否则 slate 的 body 渐变对不上。 */
function syncTheme(from: Document, to: Document): void {
  to.documentElement.className = from.documentElement.className;
  const theme = from.documentElement.getAttribute("data-theme");
  if (theme) {
    to.documentElement.setAttribute("data-theme", theme);
  } else {
    to.documentElement.removeAttribute("data-theme");
  }
}

interface PreviewFrameProps {
  device: PreviewDevice;
  children: ReactNode;
  /** iframe 文档就绪 / 卸载时回调，供外部做滚动定位。 */
  onDocumentChange?: (doc: Document | null) => void;
}

/**
 * 设备预览框。
 *
 * 用 iframe 而不是缩容器宽度：站点的响应式断点是**视口**媒体查询，容器变窄并不会
 * 触发移动端样式，只有真正给它一个窄视口才做得到。内容仍走 `createPortal`，
 * 所以预览和编辑器是同一棵 React 树——选中态、草稿、点击选区块都不用另接一套通道
 * （React 会给 portal 容器单独挂事件监听，跨 document 的点击照样触发）。
 */
export function PreviewFrame({
  device,
  children,
  onDocumentChange,
}: PreviewFrameProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [host, setHost] = useState({ width: 0, height: 0 });

  const deviceWidth = PREVIEW_DEVICES[device];
  // 装不下就整体缩小；放得下不放大，免得 390px 的手机被拉成马赛克
  const scale = host.width > 0 ? Math.min(1, host.width / deviceWidth) : 1;

  // iframe 的 document 要等 load 之后才稳定（srcDoc 也一样会走一次导航）
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

  useEffect(() => {
    if (!doc) return;
    const source = document;
    const sync = (): void => {
      syncStyles(source, doc);
      // 工作台的明暗 / 配色跟着走，预览里的 token 与 body 渐变才和主站一致
      syncTheme(source, doc);
    };
    sync();

    const styles = new MutationObserver(sync);
    styles.observe(source.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    const theme = new MutationObserver(sync);
    theme.observe(source.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => {
      styles.disconnect();
      theme.disconnect();
    };
  }, [doc]);

  return (
    <div
      ref={hostRef}
      className="min-h-0 flex-1 overflow-hidden bg-muted/30 p-3"
    >
      {/*
        外层是缩放**后**的视觉尺寸，内层 iframe 仍按设备逻辑宽度渲染。
        直角是有意的：iframe 带 transform、是独立合成层，祖先的 overflow-hidden
        与 clip-path 都裁不住它，站点页头（自带背景）的直角会露在圆角外。
      */}
      <div
        className="mx-auto overflow-hidden border bg-background shadow-sm"
        style={{ width: deviceWidth * scale, height: host.height }}
      >
        <iframe
          ref={frameRef}
          onLoad={attach}
          title="preview"
          // 空文档即可，内容由 portal 挂进来
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
      {doc ? createPortal(children, doc.body) : null}
    </div>
  );
}
