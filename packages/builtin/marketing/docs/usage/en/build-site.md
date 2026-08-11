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

Header and footer are **site-level** sections shared by every page:

- Header: four blocks by default — brand, navigation, language switcher, theme toggle —
  which you can add to, remove and reorder
- Footer: by default only a copyright line; add a blurb or link groups when you need them

The language and theme blocks ship by default because they **render nothing when they do
not apply**: a single-language site shows no switcher, and it appears by itself once you
publish your first translation. Don't want them? Delete them from the left tree.

Open any page from its list row and edit header / footer in the left tree.

> Defaults deliberately ship **no** header button. If you want a "Get started" call to
> action, add it yourself in the header settings — a prepopulated button pointing at a
> feature you haven't enabled is worse than no button.

### Navigation links

Select the header and the "navigation links" panel on the right is exactly the row your
visitors see. Four kinds of entry are available:

| Source           | Expands into                                          |
| ---------------- | ----------------------------------------------------- |
| Custom link      | One link you write, optionally with a submenu          |
| All top-level pages | Every published top-level page; new pages join automatically |
| Docs library     | The whole library, grouped by category (parent links to `/docs`) |
| One doc category | Every published doc in that category                   |

The last three are **rules**, not fixed entries: what they expand into depends on your
content, and the editor tells you what will show. When a rule expands to nothing, it is
not rendered at all — you never end up with an entrance that leads to an empty list.

The default is **all top-level pages** only — publish a page and it joins the nav
automatically. Add a docs-library entry when you need one; a docs rule only renders once
you have published documents.

Each footer column has its own list of links. To match the header, use "copy from
header" — it copies a snapshot, after which the two are edited independently.

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
