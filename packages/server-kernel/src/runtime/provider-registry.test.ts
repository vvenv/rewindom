import { describe, expect, it } from "vitest";

import { AuthenticatedOnlyAuthz, ProviderRegistry } from "./provider-registry.js";

import type { FastifyRequest } from "fastify";

function mockRequest(authUser?: {
  userId: string;
  actor_type: "tenant_user";
  is_system_admin: boolean;
}): FastifyRequest {
  return { authUser } as FastifyRequest;
}

describe("ProviderRegistry", () => {
  it("defaults to AuthenticatedOnlyAuthz", async () => {
    const registry = new ProviderRegistry();
    const authz = registry.getAuthzProvider();
    expect(authz).toBeInstanceOf(AuthenticatedOnlyAuthz);

    const allowed = await authz.check(
      mockRequest({
        userId: "u1",
        actor_type: "tenant_user",
        is_system_admin: false,
      }),
      "any.permission",
    );
    expect(allowed.allowed).toBe(true);

    const denied = await authz.check(mockRequest(undefined), "any.permission");
    expect(denied.allowed).toBe(false);
  });

  it("allows replacing AuthzProvider", () => {
    const registry = new ProviderRegistry();
    const custom = new AuthenticatedOnlyAuthz();
    registry.setAuthzProvider(custom);
    expect(registry.getAuthzProvider()).toBe(custom);
  });

});
