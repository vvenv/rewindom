---
title: Installation and deployment
description: Builds, environment variables, Docker images and single-tenant mode
category: getting-started
sort_order: 10
---

The full path from build to production, plus the handful of settings that are easiest
to get wrong.

## Build and run

```bash
pnpm build
pnpm start
```

`build` compiles both ends in parallel: Vite emits static assets for the client,
esbuild bundles the server into a single `apps/server/dist/index.js`. `start` is just
`node dist/index.js`.

> The server is a **single-file bundle** and does not read sidecar files from the
> source tree at runtime. Anything that ships with the code — site CSS, the default
> tenant's documentation — is inlined at build time by an `assemble` script. Follow
> that pattern for new assets of this kind; do not `readFile` a relative path at
> runtime.

## Environment variables

The full list lives in `.env.example` at the repo root. The ones you must think about
before going live:

| Variable                       | What it does                                        |
| ------------------------------ | --------------------------------------------------- |
| `DATABASE_URL`                 | PostgreSQL connection string                        |
| `JWT_SECRET`                   | Random string, at least 32 characters               |
| `TENANT_SECRET_ENCRYPTION_KEY` | Master key for tenant secrets, 32-byte hex (`openssl rand -hex 32`) |
| `FRONTEND_URL`                 | Product site address                                |
| `PLATFORM_URL`                 | Console address — **must be a different Host** from `FRONTEND_URL` |
| `TENANT_BASE_DOMAIN`           | Base domain for tenant subdomains (e.g. `example.com`) |
| `SINGLE_TENANT`                | `true` enables single-tenant mode                   |

### Why those two URLs need different Hosts

Routing is by Host, not by path. Put them on the same Host and the console and the
product site fight over the same entrance — what you see is `/platform` redirecting
forever. The reverse proxy depends on the same split: the platform Host serves the
static SPA, every other Host has its HTML proxied to the marketing SSR.

## Docker

The image is defined in `docker/Dockerfile` in three stages: `builder` installs and
builds, `app` is the Node API process, `web` is Nginx with the static assets.

```bash
# Exercise the full production image locally
pnpm docker:stack:up
pnpm docker:stack:logs
pnpm docker:stack:down
```

`docker/entrypoint.sh` detects the migration baseline and runs
`prisma migrate deploy` before boot, so **a fresh environment needs no manual
migration step**. Outside containers, run it once yourself:

```bash
pnpm --filter server exec prisma migrate deploy
```

## What the first boot does for you

On startup the server runs an idempotent initialization: create the default tenant,
give it a published starter site and documentation library, create the platform system
administrator. An empty database is therefore browsable the moment deployment
finishes — there is no separate seeding step.

## Single-tenant deployment

For installations that serve exactly one customer:

```bash
SINGLE_TENANT=true
```

The Tenant model stays, but creating tenants is disabled, self-registration and first
OAuth sign-in both join the default tenant, tenant-management entrances are hidden,
and tenant-facing copy never says "tenant".

**Gate:** after changing production env passthrough, run `pnpm check:prod-app-env`.

## Reverse proxy

Tenant sites arrive over subdomains (`{slug}.{TENANT_BASE_DOMAIN}`) or custom domains.
The proxy must forward **all** of those Hosts to the same backend process and preserve
the original `Host` header — that header is how the tenant is resolved.

See `docker/nginx/default.conf.template` for a working configuration.

## Next

- How the entrances split → [Host-based routing](/en/docs/host-routing)
- Tenants and domains → [Tenant administration](/en/docs/tenant-management)
