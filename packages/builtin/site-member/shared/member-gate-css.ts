/**
 * 「会员专属内容」段的样式。
 *
 * 内置段的 CSS 与段目录并置、构建期打进 `MARKETING_SITE_CSS`；贡献段进不了那次打包，
 * 所以随注册一起交给 marketing（`registerSiteSectionHtml` / `registerSiteSectionView`
 * 的 `css` 选项），由它拼在官网 CSS 末尾。
 *
 * 只用 marketing 已有的 token（`--border` / `--muted-bg` / `--muted-fg` / `--radius`），
 * 换主题时跟着变——贡献段不该自带一套写死的颜色。
 */
export const MEMBER_GATE_CSS = `
.member-gate {
  display: grid;
  justify-items: center;
  gap: .75rem;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  background: var(--muted-bg);
  padding: 2.5rem 1.5rem;
  text-align: center;
}
.member-gate-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}
.member-gate .title { font-weight: 600; }
.member-gate .muted { color: var(--muted-fg); max-width: 32rem; }
.member-gate p { margin: 0; }
`;
