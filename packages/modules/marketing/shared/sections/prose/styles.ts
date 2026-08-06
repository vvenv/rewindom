/**
 * 长文段：Markdown 排版。
 * 与 client/components/MarkdownProse.tsx 的排版一一对应，改一处要改两处。
 */

export const proseStyles = `
.prose :is(h1,h2) { font-size: 1.5rem; font-weight: 600; line-height: 1.25; margin: 3rem 0 1rem; }
.prose h2 { font-size: 1.25rem; padding-bottom: .5rem; border-bottom: 1px solid var(--border); }
.prose h3 { font-size: 1rem; font-weight: 600; line-height: 1.25; margin: 2rem 0 .75rem; }
.prose > :first-child { margin-top: 0; }
.prose p { margin: 1rem 0; line-height: 1.75; color: var(--muted-fg); }
.prose ul, .prose ol { list-style: revert; padding-left: 1.5rem; margin: 1rem 0; color: var(--muted-fg); }
.prose li { line-height: 1.75; }
.prose li + li { margin-top: .5rem; }
.prose a { color: var(--accent); font-weight: 500; text-decoration: underline; text-underline-offset: 4px; }
.prose strong { font-weight: 600; color: var(--fg); }
.prose code { border-radius: .25rem; background: var(--muted-bg); padding: .125rem .375rem; font-size: .85em; color: var(--fg); }
.prose pre { margin: 1.25rem 0; overflow-x: auto; border: 1px solid var(--border); border-radius: .75rem; background: var(--muted-bg); padding: 1rem; font-size: .875rem; line-height: 1.5; }
.prose pre code { background: transparent; padding: 0; font-size: inherit; }
.prose blockquote { margin: 1.25rem 0; border-left: 2px solid color-mix(in srgb, var(--accent) 50%, transparent); padding-left: 1rem; color: var(--muted-fg); font-style: italic; }
.prose img { display: block; margin: 1.5rem 0; max-width: 100%; height: auto; border: 1px solid var(--border); border-radius: .75rem; }
.prose .table-wrap { margin: 1.5rem 0; overflow-x: auto; border: 1px solid var(--border); border-radius: .75rem; }
.prose table { width: 100%; border-collapse: collapse; font-size: .875rem; }
.prose thead { background: var(--muted-bg); }
.prose th { border-bottom: 1px solid var(--border); padding: .625rem 1rem; text-align: left; font-weight: 500; }
.prose td { border-bottom: 1px solid var(--border); padding: .625rem 1rem; color: var(--muted-fg); }
.prose hr { margin: 2.5rem 0; border: 0; border-top: 1px solid var(--border); }
`;
