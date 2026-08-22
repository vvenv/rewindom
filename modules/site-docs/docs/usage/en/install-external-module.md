---
title: Installing an external module
description: Layout, boundary rules and the wiring steps for external modules
category: core-concepts
sort_order: 45
---

An external module is a self-contained workspace package holding both ends of a
feature. It lives under `modules/` at the repo root and talks to the kernel through the
`@rewindom/module-sdk` facade.

## Layout

```
modules/
└── my-module/
    ├── package.json          # declares the rewindom field
    ├── tsconfig.json
    ├── MODULE.md             # what this module is for
    ├── shared/               # cross-end contracts
    ├── server/               # module.ts + routes + logic
    ├── client/               # module.tsx + pages + i18n
    └── prisma/               # optional: schema.prisma
```

## package.json

```json
{
  "name": "@rewindom/my-module",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "rewindom": {
    "moduleId": "my-module",
    "prismaSchema": "./prisma/schema.prisma",
    "requires": ["rbac", "audit"]
  }
}
```

| Field          | Type     | Meaning                                                    |
| -------------- | -------- | ---------------------------------------------------------- |
| `moduleId`     | string   | Unique id used by registries, permission prefixes, audit log |
| `prismaSchema` | string?  | Schema path; when present it is linked into the main schema |
| `requires`     | string[] | Module ids this one needs — order and prerequisites only, not code access |

## Boundary rules

Imports are enforced by `verify-module.mjs`.

**Allowed:**

- `@rewindom/module-sdk` — shared contracts
- `@rewindom/module-sdk/server` — server contracts and runtime (server side only)
- `@rewindom/module-sdk/client` — client contracts and runtime (client side only)
- `@rewindom/ui` — UI primitives
- Third-party libraries (react, react-router, lucide-react, …)

**Forbidden:**

- `@rewindom/server-kernel` / `@rewindom/client-kit` / `@rewindom/shared` — always go
  through module-sdk; the kernel's internals should not become part of a module's
  dependency surface
- Other modules' packages — cross-module work goes through extension points
- Anything under `apps/*`

## Wiring it in

```bash
# 1. Put the package in modules/<moduleId>/

# 2. Install and generate registries
pnpm install
pnpm gen:external-modules

# 3. The generator may have added workspace deps to apps — install again
pnpm install

# 4. With a Prisma schema: generate the client and a migration
pnpm --filter server exec prisma generate
pnpm --filter server exec prisma migrate dev --name <module_name>

# 5. Verify
pnpm check:modules
pnpm check:deps
pnpm typecheck
```

### What gen:external-modules does

1. Discovers module packages under `modules/*`
2. Generates both `apps/{server,client}/src/external-modules.ts` registries
3. Symlinks the module's Prisma schema into `apps/server/prisma/models/<id>.prisma`
4. Registers tenant columns and the module manifest
5. Adds `workspace:*` dependencies to `apps/{server,client}/package.json`

## Prisma schema

An external module only declares models; migrations are generated and owned by
`apps/server`. **One database has exactly one migration history** — let each module
own a slice of it and deployment ordering immediately becomes something nobody can
reason about.

```prisma
model MyEntity {
  id         String   @id @default(uuid())
  tenant_id  String
  name       String
  created_at DateTime @default(now())

  @@index([tenant_id])
}
```

`tenant_id` is not optional: tables without it are rejected by the module contract
checks.

## Next

- The bigger picture → [Modular architecture](/docs/modular-architecture)
