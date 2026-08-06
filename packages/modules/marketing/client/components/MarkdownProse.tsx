import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * 站点正文 markdown 渲染（文档页 + 富文本区块共用一套排版）。
 *
 * 样式由父级 `.prose`（`sections/prose/styles.ts` → `MARKETING_SITE_CSS`）负责；
 * 组件映射只用语义标签，不在元素上挂 Tailwind。改排版时同步 prose styles 与 SSR `md()`。
 */
export const MARKDOWN_PROSE_COMPONENTS: Components = {
  // 页面外壳已有 h1（文档标题 / hero），正文里的 `#` 降一级，避免双 h1
  h1: ({ children }) => <h2>{children}</h2>,
  h2: ({ children }) => <h2>{children}</h2>,
  h3: ({ children }) => <h3>{children}</h3>,
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
