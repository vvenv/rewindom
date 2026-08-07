import { describe, it, expect } from "vitest";

import {
  isPlatformAdminActor,
  isSiteMemberActor,
  isTenantUserActor,
  type AuthActorType,
} from "./auth-actor.js";

describe("auth-actor", () => {
  describe("isPlatformAdminActor", () => {
    it("platform_admin 返回 true", () => {
      expect(isPlatformAdminActor("platform_admin")).toBe(true);
    });

    it("其它 actor 返回 false", () => {
      expect(isPlatformAdminActor("tenant_user")).toBe(false);
      expect(isPlatformAdminActor("api_key")).toBe(false);
      expect(isPlatformAdminActor("site_member")).toBe(false);
    });

    it("undefined 返回 false(未认证请求)", () => {
      expect(isPlatformAdminActor(undefined)).toBe(false);
    });
  });

  describe("isTenantUserActor", () => {
    it("tenant_user 返回 true", () => {
      expect(isTenantUserActor("tenant_user")).toBe(true);
    });

    it("其它 actor 返回 false", () => {
      expect(isTenantUserActor("platform_admin")).toBe(false);
      expect(isTenantUserActor("api_key")).toBe(false);
      expect(isTenantUserActor("site_member")).toBe(false);
    });

    it("undefined 返回 false", () => {
      expect(isTenantUserActor(undefined)).toBe(false);
    });
  });

  describe("isSiteMemberActor", () => {
    it("site_member 返回 true", () => {
      expect(isSiteMemberActor("site_member")).toBe(true);
    });

    it("其它 actor 返回 false(站点会员与工作台用户隔离)", () => {
      expect(isSiteMemberActor("tenant_user")).toBe(false);
      expect(isSiteMemberActor("platform_admin")).toBe(false);
      expect(isSiteMemberActor("api_key")).toBe(false);
    });

    it("undefined 返回 false", () => {
      expect(isSiteMemberActor(undefined)).toBe(false);
    });
  });

  describe("actor 类型互斥", () => {
    const allActors: AuthActorType[] = [
      "tenant_user",
      "platform_admin",
      "api_key",
      "site_member",
    ];

    it("每个 actor 恰好命中一个分类守卫", () => {
      for (const actor of allActors) {
        const hits = [
          isTenantUserActor(actor),
          isPlatformAdminActor(actor),
          isSiteMemberActor(actor),
        ].filter(Boolean).length;
        // api_key 不属于这三个分类(它是独立的第三方集成身份)
        if (actor === "api_key") {
          expect(hits).toBe(0);
        } else {
          expect(hits).toBe(1);
        }
      }
    });
  });
});
