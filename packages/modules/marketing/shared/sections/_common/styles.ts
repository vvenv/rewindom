/**
 * 跨段共用部件：多段 + `_common/html` 共用的 `.card` / `.grid` / `.sec-head` / `.spec` 壳。
 * FAQ 复用 `.spec` 包住 `.qa`，壳留在这里，避免无谓改 class。
 */

export const commonStyles = `
.sec-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 2rem; }
.sec-head h2 { font-size: 1.875rem; }
.sec-head .lead { margin-top: .75rem; max-width: 42rem; }

.grid { display: grid; gap: .75rem; }
.grid.cols-2 { grid-template-columns: repeat(2, minmax(0,1fr)); }
.grid.cols-3 { grid-template-columns: repeat(3, minmax(0,1fr)); }
.grid.cols-4 { grid-template-columns: repeat(4, minmax(0,1fr)); }
@media (max-width: 640px) {
  .grid.cols-2, .grid.cols-3, .grid.cols-4 { grid-template-columns: 1fr; }
}

.card { display: block; height: 100%; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg); padding: 1.25rem; }
.card-plain { border-color: transparent; padding: .5rem 0; }
.card .title { display: block; font-weight: 500; }
.card .muted { display: block; margin-top: .375rem; }
.card code { display: block; margin-top: .75rem; font-size: .75rem; color: var(--accent); }
.card .stat-value { display: block; font-size: 1.875rem; font-weight: 600; color: var(--accent); }
.card-icon { display: inline-flex; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; border-radius: .5rem; background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent); margin-bottom: .75rem; }

.spec { border: 1px solid var(--border); border-radius: 1rem; overflow: hidden; }
.spec > :first-child { border-top: 0; }
`;
