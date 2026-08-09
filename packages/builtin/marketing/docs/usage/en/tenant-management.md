---
title: Tenant administration
description: Tenants, quotas, entitlements and domains in the platform console
category: Platform admin
sort_order: 100
---

Tenants are managed in the **platform console**, not from a tenant's workspace. Only
platform administrators can reach it.

## Getting in

Locally that is `http://127.0.0.1:7300/platform`; signed-out visits redirect to
`/login`.

> It has to be `127.0.0.1`, not `localhost` — the latter is the product site entrance,
> and asking it for `/platform` bounces you back to the console Host. See
> [Host-based routing](/en/docs/host-routing).

In production this is whatever Host `PLATFORM_URL` points at.

## The tenant list

The console lists every tenant with its status, creation date, usage figures and
enabled modules. You can filter by status and search by name.

## Creating a tenant

You provide:

- **slug** — used for the subdomain `{slug}.{TENANT_BASE_DOMAIN}`, so it becomes part of
  a public address
- **name** — for display
- **default language** — the site's primary language, which decides whose URLs go
  without a prefix

A new tenant is active but its **site is empty**; automatic content only happens for the
default tenant. Either the tenant's administrator applies a starter from the workspace,
or a platform administrator does it for them.

## Quotas

Each tenant has a set of limits: users, pages, documents, storage and so on. Quotas come
from plan tiers and can be adjusted for an individual tenant.

## Entitlements

Features are controlled by entitlements: which modules are available, whether members
can be enabled, whether custom domains can be bound, and so on. They are tied to the
billing plan — upgrading unlocks more.

## Custom domains

1. The tenant points their domain at the platform with a CNAME
2. A platform administrator registers that domain against the tenant
3. The platform verifies ownership, and it goes live

Once bound, the domain serves that tenant's site and behaves exactly like a subdomain.

## Suspending a tenant

Suspension hides the site from visitors and blocks workspace sign-in, while **keeping
all data**. It is fully reversible.

Deleting is a separate, irreversible operation. For routine cleanup, prefer suspension.

## Audit

Every tenant administration action — creating, suspending, changing quotas, binding
domains — is written to the audit log, filterable by module, action and time in the
console.

## Next

- Users inside a tenant → [Users and permissions](/en/docs/users-permissions)
- Private single-tenant installs → [Installation and deployment](/en/docs/installation)
