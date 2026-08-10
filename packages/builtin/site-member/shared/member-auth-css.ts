/**
 * 会员登录 / 注册表单段的样式。
 *
 * 同 `member-gate-css.ts`：贡献段进不了官网 CSS 的那次构建，所以随注册一起交给
 * marketing 拼在末尾。只用它已有的 token（`--border` / `--muted-fg` / `--accent` /
 * `--radius`），换主题时跟着变。
 *
 * 输入框的观感刻意与 `form` 段（`sections/form/styles.css`）一致：同一个站上两个表单
 * 长得不一样，比两个都朴素更显廉价。
 */
export const MEMBER_AUTH_CSS = `
.member-auth {
  display: grid;
  gap: 1rem;
  max-width: 26rem;
  margin-inline: auto;
}
.member-auth-field {
  display: grid;
  gap: .375rem;
  min-width: 0;
}
.member-auth-field > label {
  font-size: .875rem;
  font-weight: 500;
}
.member-auth-field input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: inherit;
  padding: .5rem .75rem;
  font: inherit;
}
.member-auth-field input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.member-auth-submit {
  width: 100%;
  justify-content: center;
}
.member-auth-error {
  border: 1px solid #dc2626;
  border-radius: var(--radius);
  color: #dc2626;
  font-size: .875rem;
  padding: .5rem .75rem;
  margin: 0;
}
.member-auth-divider {
  display: flex;
  align-items: center;
  gap: .75rem;
  max-width: 26rem;
  margin: 1.25rem auto .75rem;
  color: var(--muted-fg);
  font-size: .8125rem;
}
.member-auth-divider::before,
.member-auth-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--border);
}
.member-auth-oauth-row {
  display: grid;
  gap: .5rem;
  max-width: 26rem;
  margin-inline: auto;
}
.member-auth-oauth {
  justify-content: center;
  gap: .5rem;
}
.member-auth-mark svg {
  width: 1rem;
  height: 1rem;
  display: block;
}
.member-auth-alt {
  max-width: 26rem;
  margin: 1rem auto 0;
  text-align: center;
  font-size: .875rem;
  color: var(--muted-fg);
}
/* 滑块由 site-enhance 填进来；没有 JS 时这块是空的，不占位也不留一条空框 */
.member-auth-captcha:empty {
  display: none;
}
.member-auth-captcha {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.member-auth-captcha-track {
  position: relative;
  height: 2.5rem;
  background: var(--muted-bg);
  user-select: none;
  touch-action: none;
}
.member-auth-captcha-hint {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: .8125rem;
  color: var(--muted-fg);
  pointer-events: none;
}
.member-auth-captcha-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 2.5rem;
  height: 2.5rem;
  background: var(--accent);
  cursor: grab;
}
.member-auth-captcha-image {
  display: block;
  width: 100%;
}
.member-auth-captcha-piece {
  position: absolute;
  top: 0;
}
`;
