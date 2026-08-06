/** 规格表段：行布局 + 可选左右分栏。`.spec` 壳在 `_common`。 */

export const specListStyles = `
.spec-row { display: grid; grid-template-columns: 5rem 1fr; gap: 1rem; padding: 1rem 1.25rem; font-size: .875rem; background: var(--bg); border-top: 1px solid var(--border); }
.spec-row dt { color: var(--muted-fg); }
.spec-row dd { margin: 0; font-weight: 500; }

.split { display: grid; gap: 2.5rem; grid-template-columns: 1fr 1.1fr; }
.split h2 { font-size: 1.875rem; }
.split .lead { margin-top: .75rem; }
@media (max-width: 900px) {
  .split { grid-template-columns: 1fr; }
}
`;
