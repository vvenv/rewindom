/**
 * 站点级 primitive：reset、版式外壳、`.sec*` / `.grp*`、按钮、会员入口。
 * section/block 专用样式在 `sections/<type>/styles.ts`。
 */

export const baseCss = `/**
 * 租户官网语义样式（SSR / SPA / 编辑器预览共用）。
 * 无 Tailwind；主题色变量由 marketing-site-theme 注入。
 */

* { box-sizing: border-box; }
body { margin: 0; line-height: 1.6; color: var(--fg); background: var(--bg); -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
h1, h2, h3 { letter-spacing: -.02em; margin: 0; }
p { margin: 0; }
ul, ol, dl { margin: 0; padding: 0; list-style: none; }
.wrap { width: 100%; max-width: var(--site-page-width, 72rem); margin: 0 auto; padding: 0 1.5rem; }
.muted { color: var(--muted-fg); font-size: .875rem; }
.lead { color: var(--muted-fg); }
.eyebrow { font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted-fg); }

/* 页面外壳：撑满视口 + main 吃掉中间，页脚贴底（无 Tailwind） */
.marketing-site-root { min-height: 100svh; }
.marketing-site-root.is-embedded { min-height: 100%; }
.site-stack { display: flex; flex-direction: column; min-height: 100%; }
.site-main { flex: 1 1 auto; }
.page-missing { padding: 4rem 1.5rem; }
.page-missing h1 { font-size: 1.5rem; font-weight: 600; }
.page-missing > * + * { margin-top: .5rem; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; padding: .5rem 1rem; border-radius: .5rem; background: var(--accent); color: var(--accent-fg); font-size: .875rem; font-weight: 500; border: 1px solid transparent; }
.btn-secondary { background: transparent; border-color: var(--border); color: var(--fg); }
.btn-ghost { background: transparent; border-color: transparent; color: var(--fg); }
.btn-block { display: flex; width: 100%; margin-top: 1.75rem; }
.btn-row { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 2rem; }
.btn-row.center { justify-content: center; }

/* section 版式：间距走内联 CSS 变量，其余与 client/components/sections 对齐 */
/* 段间距显式落在后一段上方（首段为 0），不靠 margin 折叠 */
.sec { scroll-margin-top: 4rem; margin-top: calc(var(--sec-gap, 0px) * .7); }
.sec-band { padding-top: calc(var(--sec-pt, 32px) * .7); padding-bottom: calc(var(--sec-pb, 32px) * .7); }
@media (min-width: 640px) { .sec { margin-top: var(--sec-gap, 0px); } .sec-band { padding-top: var(--sec-pt, 32px); padding-bottom: var(--sec-pb, 32px); } }
/* 限宽在 section 内部：色块与正文各自一档，组合出「通栏色带 + 居中正文」等排版 */
.sec-w-page { width: 100%; max-width: var(--site-page-width, 72rem); margin: 0 auto; }
.sec-content { padding: 0 1.5rem; }
.sec-c-default { width: 100%; max-width: var(--site-page-width, 72rem); margin: 0 auto; }
.sec-c-narrow { width: 100%; max-width: 48rem; margin: 0 auto; }
/* 容器段的列里外层已限宽并给了留白，section 不再自带 gutter，full 退化为 page */
.grp-col .sec-band, .sec-c-contained { max-width: none; }
.sec-c-contained { width: 100%; padding-left: 0; padding-right: 0; }

/* 容器段：窄屏一列到底，桌面进 12 栏。与 client 的 GroupSection 同构 */
.grp { display: grid; grid-template-columns: minmax(0,1fr); gap: calc(var(--grp-gap, 40px) * .7); }
.grp-col { min-width: 0; }
@media (min-width: 768px) {
  .grp { grid-template-columns: repeat(12, minmax(0,1fr)); gap: var(--grp-gap, 40px); align-items: start; }
  .grp.grp-stretch { align-items: stretch; }
  .grp-span-1 { grid-column: span 1 / span 1; }
  .grp-span-2 { grid-column: span 2 / span 2; }
  .grp-span-3 { grid-column: span 3 / span 3; }
  .grp-span-4 { grid-column: span 4 / span 4; }
  .grp-span-5 { grid-column: span 5 / span 5; }
  .grp-span-6 { grid-column: span 6 / span 6; }
  .grp-span-7 { grid-column: span 7 / span 7; }
  .grp-span-8 { grid-column: span 8 / span 8; }
  .grp-span-9 { grid-column: span 9 / span 9; }
  .grp-span-10 { grid-column: span 10 / span 10; }
  .grp-span-11 { grid-column: span 11 / span 11; }
  .grp-span-12 { grid-column: span 12 / span 12; }
  /* sticky 必须配 align-self:start：拉伸满高的列没有可滚动的余量，粘不住 */
  .grp-sticky { position: sticky; top: 5rem; align-self: start; }
}
/* 堆叠顺序只在窄屏有意义——桌面永远按声明顺序从左到右 */
@media (max-width: 767px) {
  .grp-stack-first { order: -1; }
  .grp-stack-last { order: 1; }
}
/* 光晕跟着色块走：顶到 section 容器上沿（含上留白）。isolation 不能少——
   z-index:-1 没有自己的层叠上下文会掉到祖先背景之后 */
.sec-band.has-glow { position: relative; isolation: isolate; }
.sec-glow { position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit; background: radial-gradient(60% 55% at 50% 0%, color-mix(in srgb, var(--site-accent, currentColor) 18%, transparent) 0%, transparent 72%); }
/* 色块含上下留白，内容不因换底色而横向位移 */
.sec-bg-muted, .sec-bg-accent, .sec-bg-outline, .sec-radius-default { border-radius: .75rem; }
/* 通栏色块贴着视口边，圆角会露出两个缺口 */
.sec-w-full.sec-bg-muted, .sec-w-full.sec-bg-accent, .sec-w-full.sec-bg-outline, .sec-w-full.sec-radius-default { border-radius: 0; }
.sec-bg-muted { background: var(--muted-bg); }
.sec-bg-accent { background: color-mix(in srgb, var(--accent) 8%, transparent); }
.sec-bg-outline { border: 1px solid var(--border); }
.sec-band.has-surface { background-color: var(--sec-bg, transparent); color: var(--sec-fg, inherit); }
.sec-band.has-surface[style*="--sec-bw"] { border: var(--sec-bw) solid var(--sec-bc, var(--border)); }
.sec-band.has-surface[style*="--sec-radius"] { border-radius: var(--sec-radius); }
.sec-divider-top { border-top: 1px solid var(--border); }
.sec-divider-bottom { border-bottom: 1px solid var(--border); }

.member-entry { display: inline-flex; align-items: center; gap: .5rem; }
.member-menu { position: relative; }
.member-menu > summary {
  list-style: none;
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  padding: .25rem .5rem;
  border-radius: .5rem;
  color: var(--fg);
  cursor: pointer;
}
.member-menu > summary::-webkit-details-marker { display: none; }
.member-menu > summary:hover { background: var(--muted-bg); }
.member-menu-panel {
  position: absolute;
  right: 0;
  top: calc(100% + .25rem);
  z-index: 50;
  min-width: 12rem;
  display: grid;
  gap: .125rem;
  padding: .25rem;
  border: 1px solid var(--border);
  border-radius: .5rem;
  background: var(--surface);
  box-shadow: 0 4px 16px rgba(0,0,0,.08);
}
.member-menu-panel a,
.member-menu-panel button {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .375rem .625rem;
  border-radius: .375rem;
  font-size: .875rem;
  color: var(--muted-fg);
  background: transparent;
  border: 0;
  width: 100%;
  text-align: left;
  cursor: pointer;
}
.member-menu-panel a:hover,
.member-menu-panel button:hover { background: var(--muted-bg); color: var(--fg); }
.member-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: var(--muted-bg);
  font-size: .75rem;
  font-weight: 500;
}
.member-name { max-width: 8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 640px) { .member-name { display: none; } }
.member-menu-label {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .5rem .625rem .75rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: .125rem;
}
.member-menu-label strong { display: block; font-size: .875rem; font-weight: 500; color: var(--fg); }
.member-menu-label .muted { display: block; font-size: .75rem; color: var(--muted-fg); margin-top: .125rem; }
.icon { width: 1rem; height: 1rem; flex-shrink: 0; }
.icon-sm { width: .875rem; height: .875rem; }
`;
