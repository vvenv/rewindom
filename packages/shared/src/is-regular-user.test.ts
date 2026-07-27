import { describe, expect, it } from "vitest";

import { isPlatformAdminActor } from "./auth-actor.js";
import { isRegularUser } from "./auth-types.js";
import { TENANT_IMPERSONATION_USERNAME } from "./tenant-internal.js";

describe("isRegularUser", () => {
  it("returns true for normal tenant users", () => {
    expect(
      isRegularUser({ username: "admin", actor_type: "tenant_user" }),
    ).toBe(true);
    expect(
      isRegularUser({ username: "bob", actor_type: "tenant_user" }),
    ).toBe(true);
  });

  it("returns false for platform admin", () => {
    expect(
      isRegularUser({
        username: "admin",
        actor_type: "platform_admin",
      }),
    ).toBe(false);
  });

  it("returns false for reserved internal usernames", () => {
    expect(
      isRegularUser({
        username: TENANT_IMPERSONATION_USERNAME,
        actor_type: "tenant_user",
      }),
    ).toBe(false);
    expect(
      isRegularUser({
        username: "__platform_system__",
        actor_type: "tenant_user",
      }),
    ).toBe(false);
  });

  it("returns false during impersonation session", () => {
    expect(
      isRegularUser({ username: "admin", actor_type: "tenant_user" }, true),
    ).toBe(false);
    expect(
      isRegularUser({ username: "bob", actor_type: "tenant_user" }, true),
    ).toBe(false);
    expect(
      isRegularUser({ username: "bob", actor_type: "tenant_user" }, false),
    ).toBe(true);
  });

  it("uses platform admin actor helper", () => {
    expect(isPlatformAdminActor("platform_admin")).toBe(true);
  });
});
