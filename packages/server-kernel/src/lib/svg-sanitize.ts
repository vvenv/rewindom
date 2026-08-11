import createDOMPurify, { type DOMPurify } from "dompurify";
import { JSDOM } from "jsdom";

/*
 * SVG 是唯一一种「图片即可执行文档」的上传类型：`<script>`、`on*` 事件、
 * `javascript:` URL 都会在**提供它的那个源**上执行。租户站点的源同时挂着
 * `/app/*` 工作台，所以一张恶意 SVG 等于对工作台的同源 XSS——只要骗到一次
 * 直接访问资源 URL（或把它塞进 iframe）。
 *
 * 不自己写正则剥：SVG 是 XML，实体编码、CDATA、命名空间、畸形标记的浏览器
 * 容错恢复，每一样都能绕过基于字符串的过滤。这里走真实 DOM 解析 + 白名单。
 */

let purifier: DOMPurify | null = null;

function getPurifier(): DOMPurify {
  // 建 jsdom 窗口不便宜，且多数部署一次 SVG 都不会传——按需建，只建一次
  purifier ??= createDOMPurify(new JSDOM("").window);
  return purifier;
}

/**
 * 消毒 SVG 源码，返回可安全提供的 XML。
 *
 * 返回 `null` 表示这压根不是一份可用的 SVG（解析失败，或消毒后连根元素都不剩），
 * 调用方应当拒绝上传而不是存一个空文件。
 *
 * 注意结果**按 XML 序列化**：`image/svg+xml` 在浏览器里走 XML 解析器，
 * 输出必须良构，否则用户看到的是 parser error 而不是图。
 */
export function sanitizeSvg(source: string): string | null {
  const clean = getPurifier().sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    // 按 XML 进出，保住 xmlns 与自闭合标签的良构性
    PARSER_MEDIA_TYPE: "image/svg+xml",
    /*
     * foreignObject 能把任意 HTML 塞回 SVG 里，是绕过 SVG 白名单的常见跳板；
     * SVG 图标 / logo 用不到它。
     */
    FORBID_TAGS: ["foreignObject"],
  });

  const trimmed = clean.trim();
  if (!trimmed || !trimmed.includes("<svg")) {
    return null;
  }
  return trimmed;
}
