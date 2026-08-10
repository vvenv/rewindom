---
title: Getting started
description: Run the platform locally in ten minutes, and learn which address to open
category: getting-started
sort_order: 0
---

Three commands to get everything running, then the one thing newcomers always trip
over: which local address does what.

## Prerequisites

| Tool    | Version   | Used for                        |
| ------- | --------- | ------------------------------- |
| Node.js | 22+       | Running the server, building UI |
| pnpm    | 11+       | Monorepo package management     |
| Docker  | Any recent | Local PostgreSQL and Redis     |

## 1. Install and initialize

```bash
pnpm install
pnpm setup
```

`pnpm setup` is **idempotent**: it writes `.env.local`, starts PostgreSQL and Redis in
Docker, and runs every migration. Re-running it never destroys existing data, so when
you are unsure about the current state, just run it again.

Database containers only: `pnpm db:up` (and `pnpm db:down` to stop them).

## 2. Start the dev servers

```bash
pnpm dev
```

One command starts both server and client. The frontend runs on port 7300, the API on
3700, and `/api` is proxied across — day to day you only need to remember 7300.

## 3. Which address to open

Everything is routed by **Host**, and this is the part that catches people out:

| Address                              | What it is                                    |
| ------------------------------------ | --------------------------------------------- |
| `http://localhost:7300/`             | The product site (the default tenant's site)   |
| `http://localhost:7300/app`          | The workspace; redirects to `/login` if signed out |
| `http://localhost:7300/member/login` | Site member sign-in (a separate identity)      |
| `http://127.0.0.1:7300/platform`     | The platform console                           |

**`localhost` and `127.0.0.1` are two different entrances, not one.** Opening
`/platform` on `localhost` sends you to `127.0.0.1`; opening `/` on `127.0.0.1` sends
you into the console. That split is deliberate — it lets you exercise both Host
behaviours locally without editing your hosts file. See
[Host-based routing](/en/docs/host-routing).

## 4. Open the default tenant's site

The default tenant (slug `default`) gets its site and this documentation library
**initialized automatically when the server starts** — no script to run. The starter
home page is created and published, and the docs library is seeded per language.

Initialization is **idempotent and evaluated per language**: a language that already
has published docs is skipped, so your later edits are never overwritten. To seed the
same content into another tenant, or reset the default tenant back to factory content:

```bash
pnpm --filter server exec tsx scripts/seed-local-marketing-site.ts [tenant-slug]
```

> That script **overwrites** the target tenant's starter pages and doc drafts and
> republishes them. Think before pointing it at a site that has real content.

## Next

- Understand the entrances → [Host-based routing](/en/docs/host-routing)
- Understand the architecture → [Multi-tenancy](/en/docs/multi-tenant)
- Start editing your site → [Building a site](/en/docs/build-site)
- Ship it → [Installation and deployment](/en/docs/installation)
