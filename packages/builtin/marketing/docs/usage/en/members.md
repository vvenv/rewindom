---
title: Site members
description: Member accounts, sign-in options and members-only content
category: Build and operate
sort_order: 80
---

Members are the account system for your site's **visitors**. They are entirely separate
from the users who run the site from the workspace.

## Members vs users

|              | Member                    | User                   |
| ------------ | ------------------------- | ---------------------- |
| Who          | A site visitor, your customer | Someone who runs the site |
| Entrance     | `/member/*`               | `/app/*`               |
| Sign-in page | `/member/login`           | `/login`               |
| Can do       | Read members-only content | Manage the site and its data |
| Managed in   | Site management → Members | Admin → Users          |

The two sessions are independent: one person can be a member of your site and an
administrator elsewhere without conflict.

## Enabling members

Members are a per-tenant capability and are **off by default**. While off, no sign-in or
account entrance appears in the header — a button that leads to a 403 is worse than no
button.

Once enabled the header gains a member entrance whose appearance you control in the
header settings.

## Sign-in options

Members sign in at `/member/login`, with credentials configured per tenant: email and
password, or OAuth (GitHub, Google, Microsoft and others).

OAuth needs application credentials configured on the platform side. The workspace and
site members **share one IdP redirect URI**; the callback routes to the right identity
system by state — you don't need to register two OAuth applications.

## Members-only content

Set a page's visibility to "members only":

- Signed-out visitors receive a page skeleton **with no body**; the content is never
  sent
- Signed-in members have the body filled in
- Search engines only index the public part

The point is that the server withholds it, rather than the browser hiding it. Paid
content hidden with CSS is two clicks away from being read.

## Managing members

Site management → Members: browse the list, enable or disable accounts, review activity.

Members manage their own profile and password at `/member/account`.

## When you need members

Sites that gate content: knowledge bases, courses, member-only downloads, content
unlocked after a visitor leaves their details.

Purely promotional sites — landing pages, brochure sites — don't need any of it. Leave
it off.

## Next

- Set page visibility → [Pages and layout](/en/docs/manage-pages)
- Workspace users and permissions → [Users and permissions](/en/docs/users-permissions)
