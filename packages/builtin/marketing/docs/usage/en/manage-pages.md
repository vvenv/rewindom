---
title: Pages and layout
description: The section system, columns, drafts and page presets
category: build-operate
sort_order: 60
---

Every page is a sequence of sections. This is how to arrange them.

## The sections

| Section        | Name         | What it does                        |
| -------------- | ------------ | ----------------------------------- |
| `header`       | Header       | Site-level, shared by every page    |
| `footer`       | Footer       | Site-level, shared by every page    |
| `hero`         | Hero         | Opening statement plus main button  |
| `page-header`  | Page title   | Title block for inner pages         |
| `feature-grid` | Feature grid | Grid of selling points with icons   |
| `cards`        | Cards        | A group of content cards            |
| `steps`        | Steps        | An ordered process                  |
| `spec-list`    | Spec list    | Key/value specifications            |
| `pricing`      | Pricing      | Pricing table                       |
| `faq`          | FAQ          | Collapsible questions               |
| `band`         | CTA band     | One full-width call to action       |
| `prose`        | Rich text    | Write Markdown directly             |
| `form`         | Form         | Collect leads; submissions are stored |
| `page-menu`    | Page menu    | Page-level table of contents        |
| `group`        | Columns      | A container that puts sections side by side |
| `doc-list`     | Doc list     | Documentation index                 |
| `doc-nav`      | Doc navigation | Sidebar list of documents         |
| `doc-toc`      | On this page | Headings of the current document    |
| `doc-article`  | Doc body     | The document body itself            |

The four documentation sections only make sense on the documentation template pages —
they read from the docs library.

Drag to reorder, add and remove, and edit each section's settings in the page editor.

## Columns

To place two blocks side by side, add a Columns section and put sections into each
column.

- **Column count**: add or remove columns in the structure tree on the left, up to 4
- **Widths**: select the Columns section and drag the handles on the width control. A
  row is 12 units and you drag the boundary *between* columns, so the widths always add
  up to a full row — you can never end up half configured with a gap left over
- **Dividers**: select a column and tick "divider on the right" to draw a vertical rule
  between it and the next column, full row height. The last column has none — there is
  nothing to its right to separate. Style, thickness and colour are per column, so one
  section can carry different-looking rules; leave the colour empty to follow the
  theme's border colour

Narrow screens always stack vertically and ignore the widths; the per-column "stack
order" decides what comes first.

## Drafts and publishing

Each page holds two copies:

- The **draft**, which the editor is changing and visitors cannot see
- The **live** copy, which is what visitors get

Publishing copies the draft over the live copy; reverting copies it back. The "unpublished
changes" marker in the list simply means the two differ.

Documents work exactly the same way: edit the draft, check it, then publish. Work in
progress is never exposed. Published pages also keep version history, so you can see who
changed what and when.

## Page presets

When creating a page you can start from a preset — a ready-made arrangement of sections:

- Home (default layout)
- Pricing
- About
- Contact

There are also two **documentation template pages** (docs index and docs article). They
don't appear in the page list; you only create them if you want to change how documents
are laid out. Until then the public site renders them with the built-in layout.

## Page paths

A page's path comes from its path field: the home page is always `/`; other pages map
directly, for example `pricing` → `/pricing`.

> `/docs` is reserved for the documentation library and cannot be used as a page path.
> The same applies to language codes (`en`, `zh-CN`) — they occupy the same position in
> the URL.

## Page order

The order in the page list is the order visitors see: the header's "all pages" nav, page
menus and the sitemap all follow it. Use the move up / move down buttons on each row —
the change takes effect immediately, with nothing to publish.

Every language version of a page counts as **one group** and moves together; in the nav
they occupy the same position anyway.

> The move buttons disappear while the list is filtered: what you see then is not the
> real order, so moving rows would be moving blind. Clear the filters first.

## Status and visibility

- **Status**: draft (invisible to visitors) or published. New pages start as drafts.
- **Visibility**: visible to everyone, or members only. With members-only, a signed-out
  visitor receives a page skeleton with no body at all; the body arrives after sign-in.
  It is not hidden client-side.

## SEO

A page's title and description become its SEO metadata. For detail pages (documents),
SEO **follows the content itself** rather than the template page — every document has
its own title and summary, and reusing the template's would give you dozens of identical
search results.

## Next

- Manage documentation → [Documentation library](/en/docs/manage-docs)
- Gate content behind sign-in → [Site members](/en/docs/members)
