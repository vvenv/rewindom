/** 页脚 chrome：栏位网格与法律行。 */

export const footerStyles = `
.site-footer { margin-top: 3rem; border-top: 1px solid var(--border); background: var(--muted-bg); }
.footer-grid { display: grid; gap: 2rem; padding-top: 3rem; padding-bottom: 3rem; grid-template-columns: 1.4fr repeat(3, 1fr); }
.footer-grid h2 { font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted-fg); margin-bottom: .75rem; }
.footer-grid ul { display: grid; gap: .5rem; font-size: .875rem; }
.footer-grid a { color: var(--muted-fg); }
.footer-legal { border-top: 1px solid var(--border); padding-top: 1.5rem; padding-bottom: 1.5rem; font-size: .75rem; color: var(--muted-fg); }
@media (max-width: 900px) {
  .footer-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .footer-grid { grid-template-columns: 1fr; }
}
`;
