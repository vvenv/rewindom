import { type ReactNode } from "react";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { docHeadingAnchor } from "../../shared/marketing-doc.js";

/**
 * 标题的纯文本形态，用来算锚点 id。
 *
 * 只能从已经渲染好的 children 里捞：react-markdown 给到组件的是 ReactNode 树，
 * 拿不到原始 markdown 行。`**粗体**` 这类行内标记渲染后就是纯文本，所以递归拼
 * 出来的结果和 SSR 那边喂给 `docHeadingAnchor` 的 `token.text` 是一致的。
 */
function headingText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(headingText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return headingText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/**
 * 站点正文 markdown 渲染（文档页 + 富文本区块共用一套排版）。
 *
 * 样式由父级 `.prose`（`sections/prose/styles.css` → `MARKETING_SITE_CSS`）负责；
 * 组件映射只用语义标签，不在元素上挂 Tailwind。改排版时同步 prose CSS 与 SSR `md()`。
 */
export const MARKDOWN_PROSE_COMPONENTS: Components = {
  // 页面外壳已有 h1（文档标题 / hero），正文里的 `#` 降一级，避免双 h1
  h1: ({ children }) => <h2 id={docHeadingAnchor(headingText(children))}>{children}</h2>,
  h2: ({ children }) => <h2 id={docHeadingAnchor(headingText(children))}>{children}</h2>,
  h3: ({ children }) => <h3 id={docHeadingAnchor(headingText(children))}>{children}</h3>,
  p: ({ children }) => <p>{children}</p>,
  ul: ({ children }) => <ul>{children}</ul>,
  ol: ({ children }) => <ol>{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ children, href }) => <a href={href}>{children}</a>,
  strong: ({ children }) => <strong>{children}</strong>,
  code: ({ children, className }) => {
    if (className?.includes("language-")) {
      return <code className={className}>{children}</code>;
    }
    return <code>{children}</code>;
  },
  pre: ({ children }) => <pre>{children}</pre>,
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  img: ({ src, alt }) => (
    <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} />
  ),
  table: ({ children }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>,
  hr: () => <hr />,
};

export function MarkdownProse({ markdown }: { markdown: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        components={MARKDOWN_PROSE_COMPONENTS}
        remarkPlugins={[remarkGfm]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
