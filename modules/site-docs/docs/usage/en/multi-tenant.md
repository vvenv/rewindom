---
title: Multi-tenancy
description: Tenant isolation, data scoping, the default tenant and single-tenant mode
category: core-concepts
sort_order: 30
---

The platform is multi-tenant by design: one deployment serves many tenants that never
see each other, each with its own site, users and data.

## What a tenant is

A tenant is the top-level isolation boundary. One tenant is one organization or
customer, and owns:

- Its marketing site (pages, docs, theme)
- Its users and their roles
- Its site members
- Its business data, scoped by `tenant_id`

> In tenant-facing and public copy the word "tenant" never appears — to an end user it
> is simply "your site" or "your organization". This is not fussiness about wording:
> the same code has to ship as a single-customer private deployment, and there "tenant"
> is an internal concept the customer should never meet.

## Data isolation

Every business table carries a `tenant_id`, and queries go through
`withTenantScope(tenant_id)`:

```typescript
const records = await prisma.siteDoc.findMany({
  where: withTenantScope(tenant_id, { status: "published" }),
});
```

Isolation is guaranteed by that **single entry point**, not by every call site
remembering to filter. Hand-written `where` clauses that bypass it are rejected by the
module contract checks.

## The default tenant

The tenant with slug `default` is implicitly bound to the product domain. What you see
at `FRONTEND_URL` (locally `localhost`) is its site.

Its site and documentation library are **initialized when the server starts**,
idempotently and per language: a language that already has published docs is skipped,
so nothing you edited gets overwritten. Deploying an upgrade will not clobber your
home page, and the starter content for a newly added language appears on the next
boot.

## Creating and managing tenants

New tenants are created in the platform console (`PLATFORM_URL`, locally
`127.0.0.1`). A new tenant is active; creation also lays down the default header /
footer and theme (`initializeTenantSite`).

Home and member layouts are **not** created up front — a site may never use them, and
pre-creating them leaves empty layouts that cannot be deleted. Visitors still get the
built-in layout rendered as a fallback; the layout becomes an editable record once an
admin hits "Set up layout" in the layouts section under Site → Pages. Turning a feature
on (memberships, for example) sets up the layouts that belong to it.

## Single-tenant mode

For private deployments, set `SINGLE_TENANT=true`:

- The console and tenant management are hidden
- Creating tenants is disabled; self-registration and first OAuth sign-in join the
  default tenant
- Nothing in the UI exposes the multi-tenant concept

Single-tenant and multi-tenant **share the same code**; the difference is runtime
configuration. There is no separate branch to maintain for private installs.

## Routing follows the Host

- `FRONTEND_URL` → default tenant
- `{slug}.{TENANT_BASE_DOMAIN}` → the tenant with that slug
- A tenant's custom domain → that tenant

See [Host-based routing](/en/docs/host-routing).
