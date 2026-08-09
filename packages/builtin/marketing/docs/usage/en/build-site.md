---
title: Building a site
description: Starters, themes, header and footer, navigation
category: Build and operate
sort_order: 50
---

Every site has one marketing site made of pages, a theme, and a header and footer.
This is the path from starter template to a published site.

## Starters

A new site begins from a starter: one theme plus a set of pages.

| Starter              | Good for            | Pages it creates                       |
| -------------------- | ------------------- | -------------------------------------- |
| Default marketing    | General purpose     | Home                                   |
| Product site         | Product marketing   | Home + Pricing + About + Contact       |
| Landing page         | Single-page landing | Home + Contact (a more spacious theme) |

Apply one from the site management page. Applying a starter **overwrites the content of
pages it owns**, but never deletes pages you created yourself.

> The default marketing starter creating only a home page is deliberate. Whatever a
> starter lays down, the first thing most people do is delete it. Adding a pricing page
> from the page presets costs far less than cleaning up four pages you didn't want.

## Themes

A theme is a set of design tokens — colours, fonts, spacing, radii — that set the
visual tone:

- Switch theme packs in site settings
- Individual tokens can be overridden per site (say, only the brand colour)
- The logo is a brand asset, configured separately from the theme

## Header and footer

Header and footer are **site-level** sections shared by every page:

- Header: logo, site name, navigation, sticky behaviour, layout
- Footer: logo, blurb, copyright, link groups

> Starters deliberately ship **no** header button. If you want a "Get started" call to
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

The default configuration is "all top-level pages" plus "docs library". So the moment
you publish your first document, a Docs entry appears in the header; before that, it
quietly isn't there. The docs index itself doesn't count as a top-level page, so it
never appears twice.

Each footer column has its own list of links. To match the header, use "copy from
header" — it copies a snapshot, after which the two are edited independently.

## Name and tagline

The site name and tagline appear in the header and in SEO metadata; both can be filled in per language. Replacing the
starter's placeholder copy is job number one.

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
