---
title: FAQ
description: Common questions about local setup, deployment, sites and modules
sort_order: 120
---

## Local development

### Why do `localhost:7300` and `127.0.0.1:7300` show different things?

They are two entrances. `localhost` is the product site (the default tenant),
`127.0.0.1` is the platform console. This falls out of Host-based routing — see
[Host-based routing](/en/docs/host-routing).

### Why was I redirected away from `/platform`?

Asking a product-site Host for `/platform` sends you to `PLATFORM_URL`. The console only
exists on its own Host.

### How do I test tenant subdomains locally?

Set `TENANT_BASE_DOMAIN=localhost` and open `http://{slug}.localhost:7300`. Browsers
resolve `*.localhost` to the loopback address natively, so there is no hosts file to
edit.

### My new module's page 404s

Its routes must live under `/app/<module>`. Mounted at the top level (say `/site`) they
get taken over by the CMS on tenant Hosts — `/` belongs to the tenant site, and the app
area always goes under `/app/*`.

## Database and migrations

### `migrate dev` produced DROP statements I didn't ask for

It diffs your **development database** against the schema, so leftovers in that database
— old branches, tables from another project — turn into DROPs. Use an offline diff
instead: replay the migration history into an empty shadow database and compare that
against the schema, independent of whatever your dev database has accumulated.

### Can I just drop the stray tables in my dev database?

**No.** Dropping tables doesn't change the migration history, so you create drift in the
opposite direction and Prisma escalates from "one extra drop" to "the whole schema must
be reset". The only correct fix is making the migration history and the schema agree.

### Where do external modules' migrations live?

External modules only declare `prisma/schema.prisma`; migrations are owned by
`apps/server`. One database has one migration history — the module's schema is symlinked
into the main schema and the consumer generates the migration.

### Do I have to run migrations in production?

Not with Docker: `docker/entrypoint.sh` runs `migrate deploy` for you. Outside
containers, run `pnpm --filter server exec prisma migrate deploy` once.

## Building a site

### Why does a new site only have a home page?

The default marketing starter creates just a home page, on purpose. Add pricing, about
or contact pages from the page presets, or use the product-site starter.

### Where did the "Get started" header button go?

Starters no longer ship a header button — it used to point at member registration, which
403s while members are disabled. Add your own call to action in the header settings.

### Can I use `/docs` as a page path?

No, it is reserved for the documentation library. The same goes for language codes
(`en`, `zh-CN`).

### I edited a page and visitors still see the old one

The editor changes the draft; publish it from the list. Pages and documents both work
this way.

## Documentation

### How do I write the English version of a document?

Choose the language when creating it — one row per language under the same path. The
public site serves the version matching the visitor; the primary language has no URL
prefix and the rest live at `/{locale}/docs`. See
[Documentation library](/en/docs/manage-docs).

### Can I change a document's language later?

No. That would move the row into another translation set, which may already contain a
document with the same path. Create it in the target language instead.

### Will "export all" produce duplicate filenames?

No. The primary language exports as `faq.md` and other languages as `faq.en.md`, and
imports read the suffix back.

## Deployment

### How do I configure a single-tenant install?

Set `SINGLE_TENANT=true`: the console is hidden, creating tenants is disabled, and every
request belongs to the default tenant. Run `pnpm check:prod-app-env` before committing.

### Do I need to seed the default tenant's site?

No. The server publishes a starter site and documentation library on startup —
idempotently, and evaluated per language, so it never overwrites content you changed.

## Modules

### `check:modules` is failing

It verifies registries, tenant columns, toggles, permissions, ordering, shell wiring,
navigation and import boundaries. Work through the errors — usually something is missing
from a registry, modules are in the wrong order, or a forbidden package was imported.

### Can an external module depend on another module?

Not by importing it. Cross-module work goes through extension points (events, providers,
slots). `requires` declares dependency and load order only, not code access.
