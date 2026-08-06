/** 页面菜单段：列表态导航（卡片态复用 `_common` 的 `.card`）。 */

export const pageMenuStyles = `
.page-menu-list ul { display: grid; gap: .125rem; }
.page-menu-list a { display: block; border-radius: .5rem; padding: .375rem .625rem; color: var(--muted-fg); }
.page-menu-list li[aria-current="page"] a { background: var(--muted-bg); color: var(--fg); font-weight: 500; }
.page-menu-list { font-size: .875rem; }
`;
