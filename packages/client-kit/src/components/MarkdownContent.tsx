import { cn } from "@be-water/ui/utils";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";


function createMarkdownComponents(inverted: boolean): Components {
  const codeBg = inverted ? "bg-primary-foreground/15" : "bg-background/80";
  const linkClass = inverted
    ? "underline underline-offset-2 opacity-90 hover:opacity-100"
    : "text-primary underline underline-offset-2 hover:opacity-80";
  const blockquoteBorder = inverted
    ? "border-primary-foreground/40"
    : "border-border";
  const tableBorder = inverted
    ? "border-primary-foreground/20"
    : "border-border";

  return {
    p: ({ children }) => <p className="mb-2 last:mb-0 only:mb-0">{children}</p>,
    h1: ({ children }) => (
      <h1 className="mb-2 mt-3 text-base font-semibold first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-2 mt-3 text-base font-semibold first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-1.5 mt-2.5 text-sm font-semibold first:mt-0">
        {children}
      </h3>
    ),
    ul: ({ children }) => (
      <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote
        className={cn(
          "mb-2 border-l-2 pl-3 italic last:mb-0",
          blockquoteBorder,
        )}
      >
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {children}
      </a>
    ),
    code: ({ className, children }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <code className={cn("block font-mono text-xs", className)}>
            {children}
          </code>
        );
      }
      return (
        <code
          className={cn(
            "rounded px-1 py-0.5 font-mono text-[0.8125rem]",
            codeBg,
          )}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre
        className={cn(
          "mb-2 overflow-x-auto rounded-lg p-3 font-mono text-xs last:mb-0",
          codeBg,
        )}
      >
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="mb-2 overflow-x-auto last:mb-0">
        <table className={cn("w-full border-collapse text-xs", tableBorder)}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className={cn("border-b", tableBorder)}>{children}</thead>
    ),
    th: ({ children }) => (
      <th className="px-2 py-1.5 text-left font-medium">{children}</th>
    ),
    td: ({ children }) => (
      <td className={cn("border-t px-2 py-1.5", tableBorder)}>{children}</td>
    ),
    hr: () => <hr className={cn("my-3 border-0 border-t", tableBorder)} />,
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
  };
}

export function MarkdownContent({
  content,
  inverted = false,
}: {
  content: string;
  inverted?: boolean;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={createMarkdownComponents(inverted)}
    >
      {content}
    </ReactMarkdown>
  );
}
