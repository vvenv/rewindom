import {
  PLATFORM_ADMIN_USER_ID,
  TENANT_IMPERSONATION_USERNAME,
} from "@rewindom/shared";
import { describe, it, expect } from "vitest";

import { excludeInternalUsersWhere } from "./internal-users.js";

describe("internal-users", () => {
  describe("excludeInternalUsersWhere", () => {
    it("排除平台系统用户 id", () => {
      expect(excludeInternalUsersWhere.id).toEqual({
        not: PLATFORM_ADMIN_USER_ID,
      });
    });

    it("排除租户 impersonation 影子用户 username", () => {
      expect(excludeInternalUsersWhere.username).toEqual({
        not: TENANT_IMPERSONATION_USERNAME,
      });
    });

    it("结构稳定(两个字段都存在)", () => {
      expect(Object.keys(excludeInternalUsersWhere).sort()).toEqual([
        "id",
        "username",
      ]);
    });
  });
});
