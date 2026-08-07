import { describe, it, expect } from "vitest";

import { buildTenantDocumentCountWhere } from "./tenant-document-scope.js";

describe("tenant-document-scope", () => {
  describe("buildTenantDocumentCountWhere", () => {
    it("返回 scope=TENANT + tenant_id 的 where", () => {
      const where = buildTenantDocumentCountWhere("tenant-a");
      expect(where).toEqual({
        scope: "TENANT",
        tenant_id: "tenant-a",
      });
    });

    it("不同租户的 where 互不相同(隔离边界)", () => {
      const a = buildTenantDocumentCountWhere("tenant-a");
      const b = buildTenantDocumentCountWhere("tenant-b");
      expect(a.tenant_id).not.toBe(b.tenant_id);
      // scope 保持一致(都是租户文档)
      expect(a.scope).toBe(b.scope);
    });

    it("空字符串租户 id 也按结构构造(不静默吞入参)", () => {
      const where = buildTenantDocumentCountWhere("");
      expect(where.tenant_id).toBe("");
      expect(where.scope).toBe("TENANT");
    });
  });
});
