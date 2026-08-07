/**
 * GENERATED — do not edit.
 * Source: co-located `.css` files listed in `site-css/sources.json`.
 * Regenerate: `pnpm --filter @be-water/modules assemble:marketing-css`
 */

export const MARKETING_SITE_CSS = `/**
 * 租户官网语义样式（SSR / SPA / 编辑器预览共用）。
 * 无 Tailwind；主题色变量由 marketing-site-theme 注入。
 */

* {
  box-sizing: border-box;
}
body {
  margin: 0;
  line-height: 1.6;
  color: var(--fg);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}
a {
  color: inherit;
  text-decoration: none;
}
h1,
h2,
h3 {
  letter-spacing: -0.02em;
  margin: 0;
}
p {
  margin: 0;
}
ul,
ol,
dl {
  margin: 0;
  padding: 0;
  list-style: none;
}
.wrap {
  width: 100%;
  max-width: var(--site-page-width, 72rem);
  margin: 0 auto;
  padding: 0 1.5rem;
}
.muted {
  color: var(--muted-fg);
  font-size: 0.875rem;
}
.lead {
  color: var(--muted-fg);
}
.eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted-fg);
}

/* 页面外壳：撑满视口 + main 吃掉中间，页脚贴底（无 Tailwind） */
.marketing-site-root {
  min-height: 100svh;
}
.marketing-site-root.is-embedded {
  min-height: 100%;
}
.site-stack {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.site-main {
  flex: 1 1 auto;
}
.page-missing {
  padding: 4rem 1.5rem;
}
.page-missing h1 {
  font-size: 1.5rem;
  font-weight: 600;
}
.page-missing > * + * {
  margin-top: 0.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: var(--accent);
  color: var(--accent-fg);
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid transparent;
}
.btn-secondary {
  background: transparent;
  border-color: var(--border);
  color: var(--fg);
}
.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--fg);
}
.btn-block {
  display: flex;
  width: 100%;
  margin-top: 1.75rem;
}
.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 2rem;
}
.btn-row.center {
  justify-content: center;
}

/* section 版式：间距走内联 CSS 变量，其余与 client/components/sections 对齐 */
/* 段间距显式落在后一段上方（首段为 0），不靠 margin 折叠 */
.sec {
  scroll-margin-top: 4rem;
  margin-top: calc(var(--sec-gap, 0px) * 0.7);
}
.sec-band {
  padding-top: calc(var(--sec-pt, 32px) * 0.7);
  padding-right: calc(var(--sec-pr, 0px) * 0.7);
  padding-bottom: calc(var(--sec-pb, 32px) * 0.7);
  padding-left: calc(var(--sec-pl, 0px) * 0.7);
}
@media (min-width: 640px) {
  .sec {
    margin-top: var(--sec-gap, 0px);
  }
  .sec-band {
    padding-top: var(--sec-pt, 32px);
    padding-right: var(--sec-pr, 0px);
    padding-bottom: var(--sec-pb, 32px);
    padding-left: var(--sec-pl, 0px);
  }
}
/* 限宽在 section 内部：色块与正文各自一档，组合出「通栏色带 + 居中正文」等排版 */
/*
 * 页宽色块 = 正文列，gutter 留在色块**外面**。
 *
 * 色块外框若按整个页宽算（含 gutter），有底色的段就会比同页的卡片、标题宽出 3rem，
 * 底色边、描边、分隔线全部对不上正文列——页面上一眼看得出来的那种错位。
 */
.sec-w-page {
  width: calc(100% - 3rem);
  max-width: calc(var(--site-page-width, 72rem) - 3rem);
  margin: 0 auto;
}
.sec-content {
  padding: 0 1.5rem;
}
/* 页宽色块已经让出 gutter，正文不再重复缩进 */
.sec-w-page > .sec-content {
  padding-left: 0;
  padding-right: 0;
}
/* 除非色块真的画了底色 / 描边——那 1.5rem 就是它的内边距，否则文字贴着色块边 */
.sec-w-page:is(.sec-bg-muted, .sec-bg-accent, .sec-bg-outline, .has-surface)
  > .sec-content {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}
/* 租户显式设了左右内边距：用 band 的 --sec-pl/pr，取消自动 content 垫 */
.sec-band.sec-pad-x > .sec-content {
  padding-left: 0;
  padding-right: 0;
}
.sec-c-default {
  width: 100%;
  max-width: var(--site-page-width, 72rem);
  margin: 0 auto;
}
.sec-c-narrow {
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
}
/* 容器段的列里外层已限宽并给了留白，section 不再自带 gutter，full 退化为 page */
.grp-col .sec-band,
.sec-c-contained {
  max-width: none;
}
.grp-col .sec-band {
  width: 100%;
}
.sec-c-contained {
  width: 100%;
  padding-left: 0;
  padding-right: 0;
}

/* 容器段：窄屏一列到底，桌面进 12 栏。与 client 的 GroupSection 同构 */
.grp {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: calc(var(--grp-gap, 40px) * 0.7);
}
.grp-col {
  min-width: 0;
}
@media (min-width: 768px) {
  .grp {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: var(--grp-gap, 40px);
    align-items: start;
  }
  .grp.grp-stretch {
    align-items: stretch;
  }
  .grp-span-1 {
    grid-column: span 1 / span 1;
  }
  .grp-span-2 {
    grid-column: span 2 / span 2;
  }
  .grp-span-3 {
    grid-column: span 3 / span 3;
  }
  .grp-span-4 {
    grid-column: span 4 / span 4;
  }
  .grp-span-5 {
    grid-column: span 5 / span 5;
  }
  .grp-span-6 {
    grid-column: span 6 / span 6;
  }
  .grp-span-7 {
    grid-column: span 7 / span 7;
  }
  .grp-span-8 {
    grid-column: span 8 / span 8;
  }
  .grp-span-9 {
    grid-column: span 9 / span 9;
  }
  .grp-span-10 {
    grid-column: span 10 / span 10;
  }
  .grp-span-11 {
    grid-column: span 11 / span 11;
  }
  .grp-span-12 {
    grid-column: span 12 / span 12;
  }
  /* sticky 必须配 align-self:start：拉伸满高的列没有可滚动的余量，粘不住 */
  .grp-sticky {
    position: sticky;
    top: 5rem;
    align-self: start;
  }
}
/* 堆叠顺序只在窄屏有意义——桌面永远按声明顺序从左到右 */
@media (max-width: 767px) {
  .grp-stack-first {
    order: -1;
  }
  .grp-stack-last {
    order: 1;
  }
}
/* 光晕跟着色块走：顶到 section 容器上沿（含上留白）。isolation 不能少——
   z-index:-1 没有自己的层叠上下文会掉到祖先背景之后 */
.sec-band.has-glow {
  position: relative;
  isolation: isolate;
}
.sec-glow {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  border-radius: inherit;
  background: radial-gradient(
    60% 55% at 50% 0%,
    color-mix(in srgb, var(--site-accent, currentColor) 18%, transparent) 0%,
    transparent 72%
  );
}
/* 色块含上下留白。横向上它与正文列同宽（见 .sec-w-page），换底色会把 gutter 变成
   色块的内边距，正文因此右移 1.5rem——用色块边和正文列对齐换掉那 1.5rem 的位移 */
.sec-bg-muted,
.sec-bg-accent,
.sec-bg-outline,
.sec-radius-default {
  border-radius: 0.75rem;
}
/* 通栏色块贴着视口边，圆角会露出两个缺口 */
.sec-w-full.sec-bg-muted,
.sec-w-full.sec-bg-accent,
.sec-w-full.sec-bg-outline,
.sec-w-full.sec-radius-default {
  border-radius: 0;
}
.sec-bg-muted {
  background: var(--muted-bg);
}
.sec-bg-accent {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.sec-bg-outline {
  border: 1px solid var(--border);
}
.sec-band.has-surface {
  background-color: var(--sec-bg, transparent);
  color: var(--sec-fg, inherit);
}
.sec-band.has-surface[style*="--sec-bw"] {
  border: var(--sec-bw) solid var(--sec-bc, var(--border));
}
.sec-band.has-surface[style*="--sec-radius"] {
  border-radius: var(--sec-radius);
}
.sec-divider-top {
  border-top: 1px solid var(--border);
}
.sec-divider-bottom {
  border-bottom: 1px solid var(--border);
}

.icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}
.icon-sm {
  width: 0.875rem;
  height: 0.875rem;
}

/**
 * 会员入口 chrome（site-member 填 slot；SSR 未登录态同源 class）。
 * 公开站样式仍由 marketing 注入，故文件落在本包 site-css。
 */

.member-entry {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.member-menu {
  position: relative;
}
.member-menu > summary {
  list-style: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  color: var(--fg);
  cursor: pointer;
}
.member-menu > summary::-webkit-details-marker {
  display: none;
}
.member-menu > summary:hover {
  background: var(--muted-bg);
}
.member-menu-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 0.25rem);
  z-index: 50;
  min-width: 12rem;
  display: grid;
  gap: 0.125rem;
  padding: 0.25rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.member-menu-panel a,
.member-menu-panel button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: var(--muted-fg);
  background: transparent;
  border: 0;
  width: 100%;
  text-align: left;
  cursor: pointer;
}
.member-menu-panel a:hover,
.member-menu-panel button:hover {
  background: var(--muted-bg);
  color: var(--fg);
}
.member-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: var(--muted-bg);
  font-size: 0.75rem;
  font-weight: 500;
}
.member-name {
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 640px) {
  .member-name {
    display: none;
  }
}
.member-menu-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem 0.75rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.125rem;
}
.member-menu-label strong {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--fg);
}
.member-menu-label .muted {
  display: block;
  font-size: 0.75rem;
  color: var(--muted-fg);
  margin-top: 0.125rem;
}

.sec-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}
.sec-head h2 {
  font-size: 1.875rem;
}
.sec-head .lead {
  margin-top: 0.75rem;
  max-width: 42rem;
}

.grid {
  display: grid;
  gap: 0.75rem;
}
.grid.cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.grid.cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.grid.cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
@media (max-width: 640px) {
  .grid.cols-2,
  .grid.cols-3,
  .grid.cols-4 {
    grid-template-columns: 1fr;
  }
}

.card {
  display: block;
  height: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  padding: 1.25rem;
}
.card-plain {
  border-color: transparent;
  padding: 0.5rem 0;
}
.card .title {
  display: block;
  font-weight: 500;
}
.card .muted {
  display: block;
  margin-top: 0.375rem;
}
.card code {
  display: block;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--accent);
}
.card .stat-value {
  display: block;
  font-size: 1.875rem;
  font-weight: 600;
  color: var(--accent);
}
.card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  margin-bottom: 0.75rem;
}

.spec {
  border: 1px solid var(--border);
  border-radius: 1rem;
  overflow: hidden;
}
.spec > :first-child {
  border-top: 0;
}

.site-header {
  border-bottom: 1px solid var(--border);
  background: var(--header-bg);
  backdrop-filter: blur(12px);
}
.site-header.sticky {
  position: sticky;
  top: 0;
  z-index: 40;
}
.header-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 3.5rem;
}
.header-row.header-layout-centered {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}
.header-layout-centered .header-nav {
  justify-self: center;
}
.header-layout-centered .header-actions {
  justify-self: end;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}
.logo {
  height: 1.5rem;
  width: auto;
}
.header-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.header-nav a {
  padding: 0.375rem 0.625rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--muted-fg);
}
.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
/* 语言切换：icon + dropdown，与 client SiteChrome LocaleSwitcher 对齐 */
.locale-switcher {
  position: relative;
}
.locale-switcher > summary {
  list-style: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  color: var(--fg);
  cursor: pointer;
}
.locale-switcher > summary::-webkit-details-marker {
  display: none;
}
.locale-switcher > summary:hover {
  background: var(--muted-bg);
}
.locale-switcher-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 0.25rem);
  z-index: 50;
  min-width: 8rem;
  display: grid;
  gap: 0.125rem;
  padding: 0.25rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.locale-switcher-menu a {
  display: block;
  padding: 0.375rem 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: var(--muted-fg);
  white-space: nowrap;
}
.locale-switcher-menu a:hover {
  background: var(--muted-bg);
  color: var(--fg);
}
.locale-switcher-menu a[aria-current="true"] {
  background: var(--muted-bg);
  color: var(--fg);
  font-weight: 500;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  color: var(--fg);
  background: transparent;
  border: 0;
  cursor: pointer;
}
.theme-toggle:hover {
  background: var(--muted-bg);
}
.header-mobile-nav {
  display: none;
  flex-wrap: wrap;
  gap: 0.75rem;
  border-top: 1px solid var(--border);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}
.header-mobile-nav a {
  color: var(--muted-fg);
}
@media (max-width: 640px) {
  .header-nav {
    display: none;
  }
  .header-mobile-nav {
    display: flex;
  }
}

.site-footer {
  margin-top: 3rem;
  border-top: 1px solid var(--border);
  background: var(--muted-bg);
}
.footer-grid {
  display: grid;
  gap: 2rem;
  padding-top: 3rem;
  padding-bottom: 3rem;
  grid-template-columns: 1.4fr repeat(3, 1fr);
}
.footer-grid h2 {
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted-fg);
  margin-bottom: 0.75rem;
}
.footer-grid ul {
  display: grid;
  gap: 0.5rem;
  font-size: 0.875rem;
}
.footer-grid a {
  color: var(--muted-fg);
}
.footer-legal {
  position: relative;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
  font-size: 0.75rem;
  color: var(--muted-fg);
}
/* 分隔线跟正文列同宽。\`.footer-legal\` 自己就是 \`.wrap\`，border 画在 border box 上会
   连 gutter 一起横过去，比上面那排页脚链接宽出 3rem，所以让伪元素退到 padding 里画 */
.footer-legal::before {
  content: "";
  position: absolute;
  inset: 0 1.5rem auto;
  border-top: 1px solid var(--border);
}
@media (max-width: 900px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 640px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
}

.page-head {
  padding-top: 3rem;
}
.page-head h1 {
  font-size: 1.875rem;
}
.page-head p {
  margin-top: 0.75rem;
  color: var(--muted-fg);
}

.hero h1 {
  font-size: 3rem;
  line-height: 1.1;
  max-width: 48rem;
  margin-top: 1rem;
}
.hero .lead {
  margin-top: 1.25rem;
  max-width: 36rem;
  font-size: 1.125rem;
}
.hero .eyebrow {
  color: var(--accent);
  text-transform: none;
  letter-spacing: 0.02em;
  font-size: 0.875rem;
  font-weight: 500;
}
.hero.center {
  text-align: center;
}
.hero.center h1,
.hero.center .lead,
.hero.center .stats {
  margin-left: auto;
  margin-right: auto;
}
.stats {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-width: 42rem;
  margin-top: 3.5rem;
}
.stats dt {
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted-fg);
}
.stats dd {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  font-weight: 500;
}
@media (max-width: 640px) {
  .stats {
    grid-template-columns: 1fr;
  }
  .hero h1 {
    font-size: 2.25rem;
  }
}

/* feature-grid: no section-owned rules (shared primitives cover layout). */

/* steps: no section-owned rules (shared primitives cover layout). */

.spec-row {
  display: grid;
  grid-template-columns: 5rem 1fr;
  gap: 1rem;
  padding: 1rem 1.25rem;
  font-size: 0.875rem;
  background: var(--bg);
  border-top: 1px solid var(--border);
}
.spec-row dt {
  color: var(--muted-fg);
}
.spec-row dd {
  margin: 0;
  font-weight: 500;
}

.split {
  display: grid;
  gap: 2.5rem;
  grid-template-columns: 1fr 1.1fr;
}
.split h2 {
  font-size: 1.875rem;
}
.split .lead {
  margin-top: 0.75rem;
}
@media (max-width: 900px) {
  .split {
    grid-template-columns: 1fr;
  }
}

/* cards: no section-owned rules (shared primitives cover layout). */

.page-menu-list ul {
  display: grid;
  gap: 0.125rem;
}
.page-menu-list a {
  display: block;
  border-radius: 0.5rem;
  padding: 0.375rem 0.625rem;
  color: var(--muted-fg);
}
.page-menu-list li[aria-current="page"] a {
  background: var(--muted-bg);
  color: var(--fg);
  font-weight: 500;
}
.page-menu-list {
  font-size: 0.875rem;
}

.plans {
  align-items: stretch;
  gap: 1rem;
}
.plan {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 1rem;
  background: var(--bg);
  padding: 1.5rem;
}
.plan.featured {
  border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent);
}
.plan .badge {
  position: absolute;
  top: -0.625rem;
  left: 1.5rem;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-fg);
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.125rem 0.625rem;
}
.plan h3 {
  font-weight: 500;
}
.plan .price {
  margin-top: 1.25rem;
  font-size: 1.875rem;
  font-weight: 600;
}
.checks {
  margin-top: 1.5rem;
  flex: 1;
  display: grid;
  gap: 0.625rem;
  font-size: 0.875rem;
  color: var(--muted-fg);
  align-content: start;
}
.checks li::before {
  content: "✓";
  color: var(--accent);
  margin-right: 0.5rem;
}

.qa {
  padding: 1.25rem 1.5rem;
  background: var(--bg);
  border-top: 1px solid var(--border);
}
.qa dt {
  font-weight: 500;
}
.qa dd {
  margin: 0.375rem 0 0;
  font-size: 0.875rem;
  color: var(--muted-fg);
}

/* 表单段：窄屏永远一列，桌面两列；form-field-wide 独占一行 */
.form-grid {
  display: grid;
  gap: 1rem;
}
@media (min-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
  .form-field-wide {
    grid-column: 1 / -1;
  }
}
.form-field {
  display: grid;
  gap: 0.375rem;
  min-width: 0;
}
.form-field > label {
  font-size: 0.875rem;
  font-weight: 500;
}
.form-req {
  color: var(--accent);
  margin-left: 0.125rem;
}
.form-field input,
.form-field textarea,
.form-field select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: inherit;
  padding: 0.5rem 0.75rem;
  font: inherit;
}
.form-field textarea {
  resize: vertical;
}
.form-field :is(input, textarea, select):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.form-field [aria-invalid="true"] {
  border-color: #dc2626;
}
/* 勾选框把控件放进 label 里，点文字也能勾上 */
.form-check > label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 400;
}
.form-check input {
  width: auto;
}
.form-error {
  color: #dc2626;
  font-size: 0.8125rem;
}
.form-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
.form-success {
  color: var(--accent);
  font-weight: 500;
}

.prose :is(h1, h2) {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.25;
  margin: 3rem 0 1rem;
}
.prose h2 {
  font-size: 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}
.prose h3 {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.25;
  margin: 2rem 0 0.75rem;
}
.prose > :first-child {
  margin-top: 0;
}
.prose p {
  margin: 1rem 0;
  line-height: 1.75;
  color: var(--muted-fg);
}
.prose ul,
.prose ol {
  list-style: revert;
  padding-left: 1.5rem;
  margin: 1rem 0;
  color: var(--muted-fg);
}
.prose li {
  line-height: 1.75;
}
.prose li + li {
  margin-top: 0.5rem;
}
.prose a {
  color: var(--accent);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.prose strong {
  font-weight: 600;
  color: var(--fg);
}
.prose code {
  border-radius: 0.25rem;
  background: var(--muted-bg);
  padding: 0.125rem 0.375rem;
  font-size: 0.85em;
  color: var(--fg);
}
.prose pre {
  margin: 1.25rem 0;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--muted-bg);
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
}
.prose pre code {
  background: transparent;
  padding: 0;
  font-size: inherit;
}
.prose blockquote {
  margin: 1.25rem 0;
  border-left: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
  padding-left: 1rem;
  color: var(--muted-fg);
  font-style: italic;
}
.prose img {
  display: block;
  margin: 1.5rem 0;
  max-width: 100%;
  height: auto;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
}
.prose .table-wrap {
  margin: 1.5rem 0;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
}
.prose table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.prose thead {
  background: var(--muted-bg);
}
.prose th {
  border-bottom: 1px solid var(--border);
  padding: 0.625rem 1rem;
  text-align: left;
  font-weight: 500;
}
.prose td {
  border-bottom: 1px solid var(--border);
  padding: 0.625rem 1rem;
  color: var(--muted-fg);
}
.prose hr {
  margin: 2.5rem 0;
  border: 0;
  border-top: 1px solid var(--border);
}

/* group: no section-owned rules (shared primitives cover layout). */

.band.center {
  text-align: center;
}
.band.center .lead,
.band.center .btn-row {
  margin-left: auto;
  margin-right: auto;
}
.band h2 {
  font-size: 1.875rem;
}
.band .lead {
  margin-top: 0.75rem;
  max-width: 36rem;
}

/* unsupported: no section-owned rules (shared primitives cover layout). */
`;
