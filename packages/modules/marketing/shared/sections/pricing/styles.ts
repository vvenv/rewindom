/** 定价段：套餐卡（`plan` block）与亮点列表。 */

export const pricingStyles = `
.plans { align-items: stretch; gap: 1rem; }
.plan { position: relative; display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 1rem; background: var(--bg); padding: 1.5rem; }
.plan.featured { border-color: color-mix(in srgb, var(--accent) 50%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent); }
.plan .badge { position: absolute; top: -.625rem; left: 1.5rem; border-radius: 999px; background: var(--accent); color: var(--accent-fg); font-size: .75rem; font-weight: 500; padding: .125rem .625rem; }
.plan h3 { font-weight: 500; }
.plan .price { margin-top: 1.25rem; font-size: 1.875rem; font-weight: 600; }
.checks { margin-top: 1.5rem; flex: 1; display: grid; gap: .625rem; font-size: .875rem; color: var(--muted-fg); align-content: start; }
.checks li::before { content: "✓"; color: var(--accent); margin-right: .5rem; }
`;
