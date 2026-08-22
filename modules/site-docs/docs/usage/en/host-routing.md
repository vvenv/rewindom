---
title: Host-based routing
description: One process, split by Host into product site, console and tenant sites
category: core-concepts
sort_order: 20
---

A single process routes by **Host**, not by URL path. Local and production work the
same way, only the domains differ. Once this clicks, most "why is this a 404" and "why
was I redirected" questions answer themselves.

## Three kinds of entrance

| Host                                            | What it is             | What lives there                          |
| ----------------------------------------------- | ---------------------- | ----------------------------------------- |
| `FRONTEND_URL` (locally `localhost`)            | Product site = default tenant | `/` site, `/app` workspace, `/member/*` |
| `PLATFORM_URL` (locally `127.0.0.1`)            | Platform console       | `/platform` (redirects to `/login`)       |
| `custom_domain` / `{slug}.{TENANT_BASE_DOMAIN}` | Tenant site            | The same three areas                      |

There are only two redirect rules:

- `/platform` on a tenant Host → sent to `PLATFORM_URL`
- `/` on the console Host → sent to `/platform`

## Why not split by path

Splitting by path (`/platform/*` is the console, everything else is the site) means
**every tenant's custom domain carries a console entrance** — their visitors can see an
admin area that isn't theirs. Splitting by Host keeps the console on its own Host and
leaves tenant sites completely clean.

## The app area always lives under `/app/*`

On a tenant Host, `/` belongs to the tenant's CMS: home page, their own pages, the docs
library. Everything behind sign-in gets out of the way behind one prefix:

- `/app/dashboard` — workspace
- `/app/site` — site management
- `/app/notes` — notes module
- …

This is more than a naming habit. That prefix list exists in **three separate places**:
the SSR fallback, the nginx location block, and the Vite dev proxy. When every module
claimed its own top-level path, all three had to grow together — `/site`,
`/dashboard` and `/audit-logs` were missed exactly that way and returned 404 on custom
domains for a long time. With everything under `/app/*`, all three need just `app`, and
top-level slugs go back to the tenant.

## Testing multiple tenants locally

Set the base domain to `localhost`:

```bash
TENANT_BASE_DOMAIN=localhost
```

Then open `http://{slug}.localhost:7300`. Browsers resolve `*.localhost` to the
loopback address natively — **no hosts file editing**. The three entrances stay
independent: `localhost` is still the default tenant, `127.0.0.1` is still the console,
`{slug}.localhost` is that tenant.

To exercise the custom-domain branch, set some tenant's `custom_domain` to something
like `shop.localhost` and open it directly.

## Language prefixes

The site's primary language has **no** URL prefix — it is the canonical entrance for
search engines. Other languages live under `/{locale}/…`, for example `/en/docs`. A
language segment and a page path occupy the same position in the URL and are told apart
by value, which is why `en` and `zh-CN` cannot be used as page paths.

## Next

- Tenants and data isolation → [Multi-tenancy](/docs/multi-tenant)
- Production domains → [Installation and deployment](/docs/installation)
