---
title: Building a site
description: Page editing, theme settings, header and footer, navigation
category: build-operate
sort_order: 50
---

Every site has one marketing site made of pages, a theme, and a header and footer.
New tenants get a default home page and chrome when the organization is created. From
there the path is: open a page row → change sections → publish.

## Opening the editor

The site card header has two actions; enter the editor from a page row below:

| Action / entry | Opens                                              |
| -------------- | -------------------------------------------------- |
| View website   | The live site in a new tab                         |
| Site settings  | A sheet for name, language, publishing, redirects  |
| Page row       | The website editor (that page + header/footer/theme) |

Built-in template pages (home, docs layouts, …) **cannot be deleted** — only reset to
the latest layout. Ordinary pages you create can still be deleted.

Inside the editor:

- **Sections** — page meta, header, page sections, footer in one tree
- **Theme settings** — theme pack, colours, fonts, spacing, brand assets

## Theme settings

A theme is a set of design tokens — colours, fonts, spacing, radii — that set the
visual tone:

- Switch theme packs under Theme settings in the editor
- Individual tokens can be overridden per site (say, only the brand colour)
- The logo is a brand asset, configured separately from the theme pack tokens

To pull the latest built-in layout for a template page, use **Reset layout** on the
page row. To re-apply a theme pack's defaults, use **Reset to latest** on that pack
in Theme settings.

## Header and footer

Header and footer are **site-level** sections shared by every page — and they are the
**same thing**: the same blocks, the same placement rules. Only two things differ: a
header can stick to the top, a footer can set its distance from the page content.

The default header is logo + site name + top-level page navigation + language + dark mode.
The default footer is a single copyright line.

> Language and dark mode ship by default because they **render nothing when they do not
> apply**: a single-language site shows no switcher, and it appears by itself once you
> publish your first translation. Don't want them? Delete them from the left tree.
> Buttons, doc search and the account entry are deliberately **not** preset — a
> prepopulated button pointing at a feature you haven't enabled is worse than no button.

### Where a block sits is the block's own setting

Select any block and its "Placement" group has three settings:

| Setting   | What it does                                            |
| --------- | ------------------------------------------------------- |
| Row       | Up to three rows; empty rows are not rendered           |
| Align     | Left / center / right within the row                    |
| On mobile | Keep outside / in menu / hide                           |

Every common arrangement is those three combined — there is no "layout" dropdown:

- **Centered navigation**: set the nav block's align to center
- **Header with an announcement bar**: put a text block in row 1, brand and nav in row 2
- **A typical multi-column footer**: row 1 holds the brand plus a few *stacked* nav blocks;
  row 2 holds the copyright (left) with language and dark mode (right)
- **Privacy / terms / licence links in the bottom bar**: an *inline* nav block in row 2,
  aligned right

### The blocks

| Block        | What it is                                                        |
| ------------ | ----------------------------------------------------------------- |
| Brand        | Logo, site name, one-line blurb                                   |
| Navigation   | A set of links. **Inline** suits headers and bottom bars, **stacked** suits footer columns |
| Text         | Copyright, compliance notices, announcements                      |
| Button       | A call to action                                                  |
| Doc search   | Only rendered once the site has published documents               |
| Language     | Only rendered when the page has translations                      |
| Dark mode    | Light / dark toggle                                               |
| Account      | Member sign-in / account menu (requires the member module)        |

All eight can go in either area — moving the language switcher down to the footer, or
putting a line of announcement text in the header, is a single change.

### Placeholders in text

The text block supports two placeholders: `{year}` for the current year and `{site}` for
the site name. That is why the default `© {year} {site}` keeps up with new years and
renames on its own. Want "© 2020–{year} Acme, Inc."? Just type it.

### On mobile

Blocks set to "in menu" collapse into the hamburger in the top-right and show normally on
desktop. Keep small controls like the brand and dark-mode toggle outside; set things that
simply don't fit, like the search box, to "hide".

### Navigation links

Select a navigation block and its "Links" panel is exactly what your visitors see. Four
kinds of entry are available:

| Source              | Expands into                                          |
| ------------------- | ----------------------------------------------------- |
| Custom link         | One link you write, optionally with a submenu          |
| All top-level pages | Every published top-level page; new pages join automatically |
| Docs library        | The whole library, grouped by category (parent links to `/docs`) |
| One doc category    | Every published doc in that category                   |

The last three are **rules**, not fixed entries: what they expand into depends on your
content, and the editor tells you what will show. When a rule expands to nothing, it is
not rendered at all — you never end up with an entrance that leads to an empty list.

The default is all top-level pages only. To match the header in a footer nav block, use
"copy from header" — it copies a snapshot, after which the two are edited independently.

### Spacing and dividers

Header and footer settings cover top and bottom padding, the gap within a row, and the
divider on the side facing the page content (below a header, above a footer). Give the
footer a dark background and you will usually want that divider off.

For a footer that needs real columns — proportional widths, a paragraph or a signup form
inside one — **add a "Columns" section** to the footer group. It is the same section you
use on pages: drag the split points to set the widths. The header and footer bodies do not
ship a second, area-only set of column settings.

> There is no dedicated block for social platform icons (GitHub / X / WeChat…) yet. To add
> them, use a Columns section with a rich-text section inside and write image links there.

## Name and tagline

The site name and tagline appear in the header and in SEO metadata; both can be filled in
per language. Replacing the placeholder copy from initialization is job number one.

## Languages

The site supports multiple languages. The **primary language has no URL prefix** (it is
the canonical entrance for search engines); other languages live under `/{locale}/…`.
Pages and docs are both **stored per language**: one row per language for the same
path, and those rows become a translation set automatically, which is what drives the
language switcher and hreflang tags.

When a language has no documents at all, the docs library falls back to the primary
language rather than 404ing.

## Publishing

The site has one master switch: while it is off visitors see a placeholder page.

Pages and documents each have their own draft/published state on top of that. **The
master switch is only a master switch** — individual content still has to be published.

## Next

- Arrange page layout → [Pages and layout](/en/docs/manage-pages)
- Manage documentation → [Documentation library](/en/docs/manage-docs)
