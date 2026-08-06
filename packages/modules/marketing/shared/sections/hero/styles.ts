/** Hero 段：大标题、副文、数据条。 */

export const heroStyles = `
.hero h1 { font-size: 3rem; line-height: 1.1; max-width: 48rem; margin-top: 1rem; }
.hero .lead { margin-top: 1.25rem; max-width: 36rem; font-size: 1.125rem; }
.hero .eyebrow { color: var(--accent); text-transform: none; letter-spacing: .02em; font-size: .875rem; font-weight: 500; }
.hero.center { text-align: center; }
.hero.center h1, .hero.center .lead, .hero.center .stats { margin-left: auto; margin-right: auto; }
.stats { display: grid; gap: 1.5rem; grid-template-columns: repeat(3, minmax(0,1fr)); max-width: 42rem; margin-top: 3.5rem; }
.stats dt { font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted-fg); }
.stats dd { margin: .25rem 0 0; font-size: .875rem; font-weight: 500; }
@media (max-width: 640px) {
  .stats { grid-template-columns: 1fr; }
  .hero h1 { font-size: 2.25rem; }
}
`;
