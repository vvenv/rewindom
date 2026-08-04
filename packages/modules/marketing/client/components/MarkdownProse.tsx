import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * 站点正文 markdown 渲染（文档页 + 富文本区块共用一套排版）。
 *
 * 不复用 client-kit 的 `MarkdownContent`：那份的字号是为聊天气泡调的（h1 等于正文），
 * 站点正文需要真正的标题层级——层级也是 SEO 的一部分。
 *
 * 改动这里的样式时，SSR 首屏的 `.prose` 规则（server/ssr-render.ts）要同步跟着改，
 * 否则首屏与水合后观感会漂移。
 */
export const MARKDOWN_PROSE_COMPONENTS: Components = {
  // 页面外壳已有 h1（文档标题 / hero），正文里的 `#` 降一级，避免双 h1
  h1: ({ children }) => (
    <h2 className="mt-12 mb-4 scroll-mt-20 text-2xl font-semibold tracking-tight first:mt-0">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 mb-4 scroll-mt-20 border-b border-border/60 pb-2 text-xl font-semibold tracking-tight first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 mb-3 scroll-mt-20 text-base font-semibold">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-4 leading-7 text-muted-foreground">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-6 text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-6 text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  code: ({ children, className }) => {
    // 带 language-* 的是代码块内的 code，交给 pre 排版；这里只管行内码
    if (className?.includes("language-")) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-5 overflow-x-auto rounded-xl border border-border/60 bg-muted/40 p-4 font-mono text-sm leading-6">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-5 border-l-2 border-primary/50 pl-4 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  img: ({ src, alt }) => (
    <img
      src={typeof src === "string" ? src : undefined}
      alt={alt ?? ""}
      className="my-6 h-auto max-w-full rounded-xl border border-border/60"
    />
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border/60 px-4 py-2.5 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border/40 px-4 py-2.5 text-muted-foreground">
      {children}
    </td>
  ),
  hr: () => <hr className="my-10 border-border/60" />,
};

export function MarkdownProse({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      components={MARKDOWN_PROSE_COMPONENTS}
      remarkPlugins={[remarkGfm]}
    >
      {markdown}
    </ReactMarkdown>
  );
}
