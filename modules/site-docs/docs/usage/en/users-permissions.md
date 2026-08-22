---
title: Users and permissions
description: User management, roles and the RBAC permission model
category: platform-admin
sort_order: 110
---

This covers users inside a tenant. "User" here means someone who works in the
workspace — not a site member; see [Site members](/docs/members) for the difference.

## Managing users

Admin → Users:

- Create a user (username plus an initial password)
- Edit details, enable or disable, reset the password
- Assign roles

Users sign in to `/app/*`; which modules they see depends on their permissions.

## Where permissions come from

There are exactly two sources:

1. **The system administrator flag.** A user with it holds every permission in the
   tenant and needs no roles at all. Keep at least one such user, or nobody can grant
   anything to anyone.
2. **Roles.** For everyone else, permissions come **only** from assigned roles. No
   roles means no permissions.

New tenants ship with no predefined roles. A preset "Editor" means something different
at every organization, so rather than guess, the first administrator builds the roles
that match how the team actually works.

## Permission names

Permissions are named `<module>.<action>` and each module declares its own, which are
merged into a catalogue:

| Permission    | Meaning                |
| ------------- | ---------------------- |
| `site.read`   | View site content      |
| `site.write`  | Edit site content      |
| `user.manage` | Manage users           |
| `role.manage` | Manage roles           |
| `audit.read`  | Read the audit log     |

Only keys that exist in the catalogue take effect. Typing one by hand raises no error
but never matches anything, so build roles by ticking entries from the catalogue.

## Managing roles

Admin → Roles: browse the permission catalogue, create a role and tick its permissions,
edit it, or delete it (roles still assigned must be unassigned first).

## Checking permissions

On the client:

```tsx
const { hasPermission } = usePermissions();
if (hasPermission("site.write")) {
  // show the edit button
}
```

Entrances the user lacks permission for are **not rendered at all**, rather than
disabled — a button that does nothing just generates questions.

On the server:

```typescript
app.get("/api/site/docs", { preHandler: [app.requirePermission("site.read")] }, handler);
```

The server check is the only one that actually enforces anything. Hiding UI is a
courtesy; anyone can call the endpoint directly.

## Audit log

Every write is audited: who, when, which resource, what changed. Filter by module,
action and time in Admin → Audit log.

New modules must audit their writes too — it is one of the module contract checks, and
`check:modules` fails when it is missing.

## Members, for comparison

|            | User             | Member                    |
| ---------- | ---------------- | ------------------------- |
| Who        | Runs the site    | Visits the site           |
| Entrance   | `/app/*`         | `/member/*`               |
| Permissions | RBAC roles      | Signed in as a member, or not |
| Managed in | Admin → Users    | Site management → Members |
