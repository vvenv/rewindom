---
title: Documentation library
description: Creating, publishing and translating docs, plus import and export
category: Build and operate
sort_order: 70
---

Every site has a documentation library, published at `/docs` (index) and
`/docs/…` (article). The page you are reading lives in one.

## What a document is

A title, a Markdown body and a category. It does not go through the page layout system:

| Field       | Meaning                                              |
| ----------- | ---------------------------------------------------- |
| Path        | URL segment (`/docs/<path>`)                         |
| Language    | One row per translation; with the path it identifies the document |
| Title       | Title                                                |
| Summary     | Used in SEO and listings                             |
| Body        | Markdown body                                        |
| Category    | The index groups by it                               |
| Sort weight | Ascending                                            |

**Layout** belongs to the two documentation template pages — writing and layout are
separate jobs.

## Drafts and publishing

The same model as pages:

- The editor changes a **draft**
- Publishing copies it to the **live** copy that visitors see
- Draft changes can be reverted back to the live content
- Unpublishing removes a document from `/docs` while keeping its content

The workflow is: edit, preview, publish.

## Creating and editing

Site management → Documentation:

1. Click the floating button to create
2. Fill in title, path, language, category and body
3. Save (this writes the draft)
4. Publish from the row actions

The editor has a full-screen split preview: Markdown on the left, live rendering on the
right. `⌘S` / `Ctrl+S` saves.

## Path rules

- One segment: starts and ends alphanumeric, hyphens allowed in between
- Lowercase, at most 63 characters
- Examples: `quickstart`, `api-reference`, `faq`

The path is locked once created — changing it breaks every inbound link and search
result. To change a path, create a new document and unpublish the old one.

## Languages

Each language is **its own row** under the same path, with independent draft and
published state. Pick the language when creating; it cannot be changed afterwards,
because that would move the row into another translation set that may already have a
document with the same path. To move a document to another language, create it there.

The public site picks the version matching the visitor:

- The primary language has no URL prefix; others live at `/{locale}/docs`
- If the requested language has **no documents at all**, the whole library falls back to
  the primary language instead of showing an empty index or a 404
- If one document is missing that language, only that document falls back

Once the library holds more than one language, the admin list gains a Language column
and a language filter. With a single language, neither is shown.

## Categories and ordering

- The index groups by category; the **order of the groups** comes from the sort weight
  of the first document in each
- Within a category, documents sort by sort weight, then by title
- An empty category means **uncategorized**: those documents are listed at the top
  level, always last, and are never swept into a group called "Other". Don't invent
  categories just to fill the field — a category with one document has a heading that
  separates nothing
- If every document shares one category, neither the sidebar nor the header dropdown
  draws category headings

## Import and export

Documents move in and out as `.md` files. The filename is the path and frontmatter
carries the metadata (field names follow the import format):

```markdown
---
title: Document title
slug: quickstart
locale: en
description: One-line summary
category: Category name
sort_order: 10
---

Body goes here…
```

- **Import**: an existing path in the same language has its draft overwritten — updating
  content is the point of importing. Published documents need publishing again
  afterwards. When frontmatter **omits** `sort_order`, the existing order is left alone;
  ordering is usually something you dragged into place and shouldn't be reset by an
  import.
- **Export**: one document or all of them, exporting draft content exactly as the editor
  shows it.

The language travels with the file: frontmatter `locale` first, then a filename suffix
(`faq.en.md`), and failing both it lands in the site's primary language. On export the
primary language is `faq.md` and other languages are `faq.en.md` — so "export all"
never produces duplicate filenames, and an export can be re-imported as-is.

## Next

- Change the document layout → [Pages and layout](/en/docs/manage-pages)
- Put docs in the navigation → [Building a site](/en/docs/build-site)
